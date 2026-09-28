import pytest
from pydantic import ValidationError

from app.passwords import (
    LoginCredentials,
    NewPasswordInput,
    hash_new_password,
    verify_password,
)

TEST_EMAIL = "editor@example.com"
TEST_PASSWORD = "frase longa de teste"


def login(password: str = TEST_PASSWORD) -> LoginCredentials:
    return LoginCredentials.model_validate({"email": TEST_EMAIL, "password": password})


def test_login_normalizes_email_but_preserves_password_exactly() -> None:
    credentials = LoginCredentials.model_validate(
        {"email": "  EDITOR@EXAMPLE.COM  ", "password": " senha com espaços "}
    )
    assert credentials.email == TEST_EMAIL
    assert credentials.password.get_secret_value() == " senha com espaços "
    assert LoginCredentials.model_validate({"email": TEST_EMAIL, "password": "x"})


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "invalid", "password": TEST_PASSWORD},
        {"email": TEST_EMAIL, "password": ""},
        {"email": TEST_EMAIL, "password": TEST_PASSWORD, "role": "ADMIN"},
    ],
)
def test_login_contract_rejects_invalid_or_extra_fields(payload: dict[str, str]) -> None:
    with pytest.raises(ValidationError):
        LoginCredentials.model_validate(payload)


def test_new_password_requires_ten_characters_without_complexity_rules() -> None:
    with pytest.raises(ValidationError) as failure:
        NewPasswordInput.model_validate({"password": "9 chars!!"})
    assert "9 chars!!" not in str(failure.value)
    assert "9 chars!!" not in repr(failure.value.errors())
    assert NewPasswordInput.model_validate({"password": "uma frase longa é válida"})
    assert NewPasswordInput.model_validate({"password": "a" * 1000})


def test_invalid_email_errors_do_not_echo_password() -> None:
    with pytest.raises(ValidationError) as failure:
        LoginCredentials.model_validate({"email": "invalid", "password": TEST_PASSWORD})
    assert TEST_PASSWORD not in str(failure.value)
    assert TEST_PASSWORD not in repr(failure.value.errors())


def test_password_is_masked_in_model_representation_and_serialization() -> None:
    credentials = login()
    assert TEST_PASSWORD not in repr(credentials)
    assert TEST_PASSWORD not in credentials.model_dump_json()
    assert "**********" in credentials.model_dump_json()


def test_argon2id_hash_verifies_and_rejects_wrong_password() -> None:
    encoded = hash_new_password(NewPasswordInput(password=TEST_PASSWORD))
    assert encoded != TEST_PASSWORD
    assert encoded.startswith("$argon2id$v=19$m=65536,t=3,p=4$")
    assert TEST_PASSWORD not in encoded
    assert verify_password(login(), encoded)
    assert not verify_password(login("outra frase longa"), encoded)


def test_hash_uses_distinct_random_salts() -> None:
    value = NewPasswordInput(password=TEST_PASSWORD)
    assert hash_new_password(value) != hash_new_password(value)


@pytest.mark.parametrize("encoded", ["", "not-a-hash", "$argon2i$v=19$m=65536,t=3,p=4$bad"])
def test_malformed_or_other_algorithm_hash_never_authenticates(encoded: str) -> None:
    assert not verify_password(login(), encoded)
