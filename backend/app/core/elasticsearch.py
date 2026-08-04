from elasticsearch import AsyncElasticsearch
from app.core.config import settings

_es_client = None


def get_es() -> AsyncElasticsearch:
    global _es_client
    if _es_client is None:
        _es_client = AsyncElasticsearch([settings.ELASTICSEARCH_URL])
    return _es_client


async def close_es():
    global _es_client
    if _es_client:
        await _es_client.close()
        _es_client = None
