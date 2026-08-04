from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "shadowguard",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.modules.kolkhoz.tasks",
        "app.modules.droper.tasks",
        "app.modules.piramida.tasks",
        "app.modules.shadowbet.tasks",
        "app.modules.tengraf.tasks",
        "app.modules.contraband.tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Almaty",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.modules.kolkhoz.tasks.*": {"queue": "kolkhoz"},
        "app.modules.droper.tasks.*": {"queue": "droper"},
        "app.modules.piramida.tasks.*": {"queue": "piramida"},
        "app.modules.shadowbet.tasks.*": {"queue": "shadowbet"},
        "app.modules.tengraf.tasks.*": {"queue": "tengraf"},
        "app.modules.contraband.tasks.*": {"queue": "contraband"},
    },
    beat_schedule={
        "kolkhoz-periodic-scan": {
            "task": "app.modules.kolkhoz.tasks.periodic_exchange_scan",
            "schedule": 3600.0,
        },
        "droper-periodic-scan": {
            "task": "app.modules.droper.tasks.periodic_channel_scan",
            "schedule": 7200.0,
        },
        "piramida-periodic-scan": {
            "task": "app.modules.piramida.tasks.periodic_scheme_scan",
            "schedule": 3600.0,
        },
        "shadowbet-periodic-scan": {
            "task": "app.modules.shadowbet.tasks.periodic_platform_scan",
            "schedule": 7200.0,
        },
        "tengraf-periodic-scan": {
            "task": "app.modules.tengraf.tasks.periodic_darknet_scan",
            "schedule": 7200.0,
        },
        "contraband-periodic-scan": {
            "task": "app.modules.contraband.tasks.periodic_contraband_scan",
            "schedule": 7200.0,
        },
    },
)