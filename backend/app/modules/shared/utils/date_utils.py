from datetime import datetime, timezone, timedelta

KZ_TIMEZONE_OFFSET = timedelta(hours=5)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def to_kz_time(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt + KZ_TIMEZONE_OFFSET


def format_kz(dt: datetime) -> str:
    return to_kz_time(dt).strftime("%Y-%m-%d %H:%M (UTC+5)")


def days_ago(days: int) -> datetime:
    return utcnow() - timedelta(days=days)


def hours_ago(hours: int) -> datetime:
    return utcnow() - timedelta(hours=hours)


def timestamp_to_datetime(ts: int) -> datetime:
    return datetime.utcfromtimestamp(ts / 1000 if ts > 1e10 else ts)


def is_recent(dt: datetime, within_days: int = 30) -> bool:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (utcnow() - dt).days <= within_days
