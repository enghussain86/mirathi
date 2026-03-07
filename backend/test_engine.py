from engine.models import CaseInput, DeceasedGender, EstateInput, HeirInput, HeirRole
from engine.calculator import calculate_case

case = CaseInput(
    deceased_gender=DeceasedGender.MALE,
    estate=EstateInput(
        total=100000,
        debts=10000,
        will=40000,
        funeral=5000,
    ),
    heirs=[
        HeirInput(id="1", role=HeirRole.WIFE, name="زوجة 1"),
        HeirInput(id="2", role=HeirRole.MOTHER, name="الأم"),
        HeirInput(id="3", role=HeirRole.FATHER, name="الأب"),
        HeirInput(id="4", role=HeirRole.SON, name="ابن 1"),
        HeirInput(id="5", role=HeirRole.DAUGHTER, name="بنت 1"),
        HeirInput(id="6", role=HeirRole.FULL_BROTHER, name="أخ شقيق"),
    ],
)

result = calculate_case(case)

print("IS VALID:", result.is_valid)

if result.validation_issues:
    print("VALIDATION ISSUES:")
    for issue in result.validation_issues:
        print("-", issue.code, issue.message)

if result.estate:
    print("\nESTATE:")
    print("gross_estate =", result.estate.gross_estate)
    print("funeral =", result.estate.funeral)
    print("debts =", result.estate.debts)
    print("requested_will =", result.estate.requested_will)
    print("allowed_will =", result.estate.allowed_will)
    print("net_estate =", result.estate.net_estate)

print("\nSHARES:")
for s in result.shares:
    print(
        s.name,
        "|",
        s.role.value,
        "|",
        s.share_type.value,
        "|",
        s.fraction,
        "|",
        s.amount,
        "|",
        s.percentage,
    )

print("\nBLOCKED:")
for b in result.blocked:
    print(b.name, "|", b.role.value, "|", b.reason)

print("\nNOTES:")
for n in result.notes:
    print("-", n)

print("\nREFERENCES:")
for r in result.references:
    print("-", r.source_type, "|", r.title, "|", r.citation)