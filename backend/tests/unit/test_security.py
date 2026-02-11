from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_secure_token,
    hash_auth_key,
    verify_auth_key,
)


def test_hash_and_verify_auth_key():
    auth_key = "test_auth_key_that_is_long_enough_1234567890"
    hashed = hash_auth_key(auth_key)
    assert hashed != auth_key
    assert verify_auth_key(auth_key, hashed)
    assert not verify_auth_key("wrong_key", hashed)


def test_create_and_decode_access_token():
    subject = "test-user-id"
    token = create_access_token(subject)
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == subject
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    subject = "test-user-id"
    token = create_refresh_token(subject)
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == subject
    assert payload["type"] == "refresh"
    assert "jti" in payload


def test_decode_invalid_token():
    assert decode_token("invalid.token.here") is None


def test_generate_secure_token():
    token1 = generate_secure_token()
    token2 = generate_secure_token()
    assert token1 != token2
    assert len(token1) > 0


def test_access_token_extra_claims():
    token = create_access_token("user1", extra_claims={"role": "admin"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["role"] == "admin"
