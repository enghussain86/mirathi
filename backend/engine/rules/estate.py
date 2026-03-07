# backend/engine/rules/estate.py
from __future__ import annotations

from ..models import EstateComputation, EstateInput


def compute_estate(estate: EstateInput) -> EstateComputation:
    """
    ترتيب الحقوق المتعلقة بالتركة:
    1) تجهيز الميت بالمعروف
    2) قضاء الديون
    3) تنفيذ الوصية بحدود الثلث
    4) قسمة ما يبقى على الورثة
    """
    gross = max(float(estate.total), 0.0)
    funeral = max(float(estate.funeral), 0.0)
    debts = max(float(estate.debts), 0.0)
    requested_will = max(float(estate.will), 0.0)

    # بعد خصم التجهيز والديون
    base_after_funeral_and_debts = gross - funeral - debts
    if base_after_funeral_and_debts < 0:
        base_after_funeral_and_debts = 0.0

    # الوصية لا تزيد على الثلث من المتبقي بعد التجهيز والديون
    allowed_will_ceiling = base_after_funeral_and_debts / 3.0
    allowed_will = min(requested_will, allowed_will_ceiling)

    net = gross - funeral - debts - allowed_will
    if net < 0:
        net = 0.0

    notes = []

    if requested_will > allowed_will:
        notes.append(
            "تم تخفيض الوصية إلى الحد المسموح به شرعًا وقانونًا، وهو ثلث المتبقي بعد التجهيز والديون."
        )

    if gross == 0 and estate.assets:
        notes.append("إجمالي التركة كان صفرًا، لذلك تم الاعتماد على القيمة المدخلة كما هي دون تعديل خارجي.")

    if funeral + debts > gross:
        notes.append("التجهيز والديون يساويان أو يتجاوزان إجمالي التركة تقريبًا.")

    return EstateComputation(
        gross_estate=round(gross, 2),
        funeral=round(funeral, 2),
        debts=round(debts, 2),
        requested_will=round(requested_will, 2),
        allowed_will=round(allowed_will, 2),
        net_estate=round(net, 2),
        notes=notes,
    )