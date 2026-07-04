import os
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True, socket_connect_timeout=3)


def is_redis_available() -> bool:
    """Check Redis connectivity without raising — used for graceful degradation elsewhere."""
    try:
        redis_client.ping()
        return True
    except redis.exceptions.RedisError:
        return False