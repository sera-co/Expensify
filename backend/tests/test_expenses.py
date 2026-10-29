from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
from database import Base, get_db


@pytest.fixture
def client(tmp_path):
    database_path = tmp_path / "test_expenses.db"
    test_engine = create_engine(
        f"sqlite:///{database_path}",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_get_db
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()
    test_engine.dispose()


@pytest.fixture
def alice_headers(client):
    response = client.post("/register", json={"username": "alice", "password": "password123"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def seeded_expenses(client, alice_headers):
    expenses = [
        {"category": "Food", "amount": 25, "description": "Grocery run", "date": "2025-01-01"},
        {"category": "Transport", "amount": 15, "description": "Bus ticket", "date": "2025-01-02"},
        {"category": "Food", "amount": 75, "description": "Dinner downtown", "date": "2025-01-03"},
        {"category": "Bills", "amount": 120, "description": "Electricity bill", "date": "2025-01-04"},
    ]
    for expense in expenses:
        response = client.post("/add-expense", json=expense, headers=alice_headers)
        assert response.status_code == 200
    return expenses


def get_expenses(client, headers, **params):
    return client.get("/expenses", params=params, headers=headers)


@pytest.mark.parametrize(
    ("params", "expected_descriptions"),
    [
        ({"category": "Food"}, {"Grocery run", "Dinner downtown"}),
        ({"from_date": "2025-01-03"}, {"Dinner downtown", "Electricity bill"}),
        ({"to_date": "2025-01-02"}, {"Grocery run", "Bus ticket"}),
        ({"min_amount": 75}, {"Dinner downtown", "Electricity bill"}),
        ({"max_amount": 25}, {"Grocery run", "Bus ticket"}),
        ({"search": "DOWNTOWN"}, {"Dinner downtown"}),
    ],
)
def test_each_filter(client, alice_headers, seeded_expenses, params, expected_descriptions):
    response = get_expenses(client, alice_headers, **params)
    assert response.status_code == 200
    assert {item["description"] for item in response.json()["items"]} == expected_descriptions


@pytest.mark.parametrize(
    ("sort_by", "expected_first"),
    [
        ("date", "Grocery run"),
        ("amount", "Bus ticket"),
        ("category", "Electricity bill"),
    ],
)
def test_sorting_ascending(client, alice_headers, seeded_expenses, sort_by, expected_first):
    response = get_expenses(client, alice_headers, sort_by=sort_by, sort_order="asc")
    assert response.status_code == 200
    assert response.json()["items"][0]["description"] == expected_first


def test_sorting_descending(client, alice_headers, seeded_expenses):
    response = get_expenses(client, alice_headers, sort_by="amount", sort_order="desc")
    assert [item["amount"] for item in response.json()["items"]] == [120.0, 75.0, 25.0, 15.0]


def test_pagination(client, alice_headers, seeded_expenses):
    response = get_expenses(client, alice_headers, page=2, page_size=2)
    result = response.json()
    assert result["total"] == 4
    assert result["page"] == 2
    assert result["page_size"] == 2
    assert result["total_pages"] == 2
    assert [item["description"] for item in result["items"]] == ["Bus ticket", "Grocery run"]


def test_combined_filters(client, alice_headers, seeded_expenses):
    response = get_expenses(
        client,
        alice_headers,
        category="Food",
        from_date="2025-01-02",
        max_amount=80,
        search="dinner",
        sort_by="amount",
        sort_order="asc",
    )
    result = response.json()
    assert response.status_code == 200
    assert result["total"] == 1
    assert result["items"][0]["description"] == "Dinner downtown"


@pytest.mark.parametrize(
    ("params", "message"),
    [
        (
            {"from_date": "2025-01-03", "to_date": "2025-01-02"},
            "from_date must be on or before to_date",
        ),
        (
            {"min_amount": 20, "max_amount": 10},
            "min_amount must be less than or equal to max_amount",
        ),
        ({"sort_by": "created_at"}, "sort_by must be one of: date, amount, category"),
        ({"sort_order": "sideways"}, "sort_order must be one of: asc, desc"),
    ],
)
def test_invalid_filters_return_clear_422(client, alice_headers, params, message):
    response = get_expenses(client, alice_headers, **params)
    assert response.status_code == 422
    assert response.json()["detail"] == message


def test_page_size_must_not_exceed_100(client, alice_headers):
    response = get_expenses(client, alice_headers, page_size=101)
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "page_size"]


def test_requires_authentication(client):
    response = client.get("/expenses")
    assert response.status_code == 401


def test_user_only_sees_their_own_expenses(client, alice_headers, seeded_expenses):
    bob_response = client.post("/register", json={"username": "bob", "password": "password123"})
    assert bob_response.status_code == 201
    bob_headers = {"Authorization": f"Bearer {bob_response.json()['access_token']}"}
    bob_expense = {
        "category": "Other",
        "amount": 999,
        "description": "Bob private expense",
        "date": date(2025, 1, 5).isoformat(),
    }
    assert client.post("/add-expense", json=bob_expense, headers=bob_headers).status_code == 200

    alice_result = get_expenses(client, alice_headers).json()
    bob_result = get_expenses(client, bob_headers).json()
    assert alice_result["total"] == 4
    assert all(item["description"] != "Bob private expense" for item in alice_result["items"])
    assert [item["description"] for item in bob_result["items"]] == ["Bob private expense"]
