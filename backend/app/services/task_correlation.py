from sqlalchemy import select
from app.models.task import ModuleTask, TaskStatus
from app.services.correlation_service import correlate_module_results


RESULT_KEYS = {
    "kolkhoz": "results",
    "droper": "top_channels",
    "piramida": "results",
    "shadowbet": "results",
    "tengraf": "findings",
}


async def attach_cross_module_correlations(db, output: dict) -> dict:
    module_results = {}

    result = await db.execute(
        select(ModuleTask)
        .where(ModuleTask.status == TaskStatus.success)
        .order_by(ModuleTask.completed_at.desc())
        .limit(20)
    )

    previous_tasks = result.scalars().all()

    for task in previous_tasks:
        data = task.result_data or {}
        key = RESULT_KEYS.get(task.module_id)

        if not key:
            continue

        items = data.get(key) or []

        if isinstance(items, list) and items:
            module_results[task.module_id] = items

    current_module = output.get("module")
    current_items = []

    for key in RESULT_KEYS.values():
        if isinstance(output.get(key), list):
            current_items = output.get(key)
            break

    if current_items and current_module:
        module_results[current_module] = current_items

    output["correlations"] = correlate_module_results(module_results)
    output["correlation_count"] = len(output["correlations"])

    return output