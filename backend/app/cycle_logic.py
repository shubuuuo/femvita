"""Cycle maths. Pure Python (no DB, no FastAPI), so it's easy to test.
Everything here is a calendar-method estimate, not medical advice."""
from bisect import bisect_right
from dataclasses import dataclass
from datetime import date, timedelta
from statistics import mean

DEFAULT_CYCLE_LENGTH = 28
DEFAULT_PERIOD_LENGTH = 5
LUTEAL_PHASE = 14      # days between ovulation and the next period (fairly constant)
NEW_PERIOD_GAP = 7     # flow-free days that separate two periods
CYCLE_RANGE = (21, 45)   # ignore cycle lengths outside this (missed logs, spotting)
PERIOD_RANGE = (1, 10)
RECENT = 6             # average over the last N cycles


@dataclass
class CycleModel:
    starts: list[date]   # first day of each logged period
    avg_cycle: int
    avg_period: int
    cycles_used: int


def group_periods(flow_dates: list[date]) -> list[tuple[date, date]]:
    periods: list[tuple[date, date]] = []
    for d in sorted(flow_dates):
        if periods and (d - periods[-1][1]).days <= NEW_PERIOD_GAP:
            periods[-1] = (periods[-1][0], d)
        else:
            periods.append((d, d))
    return periods


def _average(values: list[int], lo: int, hi: int, default: int) -> tuple[int, int]:
    good = [v for v in values if lo <= v <= hi][-RECENT:]
    return (round(mean(good)), len(good)) if good else (default, 0)


def build_model(flow_dates: list[date]) -> CycleModel:
    periods = group_periods(flow_dates)
    starts = [s for s, _ in periods]
    cycle_lengths = [(b - a).days for a, b in zip(starts, starts[1:])]
    # The newest period may still be going, so leave it out of the length average
    period_lengths = [(e - s).days + 1 for s, e in periods[:-1]]
    avg_cycle, used = _average(cycle_lengths, *CYCLE_RANGE, DEFAULT_CYCLE_LENGTH)
    avg_period, _ = _average(period_lengths, *PERIOD_RANGE, DEFAULT_PERIOD_LENGTH)
    return CycleModel(starts, avg_cycle, avg_period, used)


def ovulation_day(cycle_len: int) -> int:
    return max(cycle_len - LUTEAL_PHASE, 1)


def fertile_range(cycle_len: int) -> tuple[int, int]:
    o = ovulation_day(cycle_len)
    return max(o - 5, 1), o + 1


def locate(model: CycleModel, d: date) -> tuple[int, int] | None:
    """(cycle_day, length of that cycle) for any date, or None before the first period."""
    starts = model.starts
    if not starts or d < starts[0]:
        return None
    i = bisect_right(starts, d) - 1
    start = starts[i]
    if i < len(starts) - 1:  # a finished cycle: use its real length
        return (d - start).days + 1, (starts[i + 1] - start).days
    # latest cycle and future ones: repeat the average length
    k = (d - start).days // model.avg_cycle
    start += timedelta(days=k * model.avg_cycle)
    return (d - start).days + 1, model.avg_cycle


def classify(model: CycleModel, d: date, today: date, flow_logged: bool) -> dict:
    loc = locate(model, d)
    if loc is None:
        return dict(cycle_day=None, is_predicted_period=False, is_fertile=False, is_ovulation=False)
    cycle_day, length = loc
    f_start, f_end = fertile_range(length)
    return dict(
        cycle_day=cycle_day,
        is_predicted_period=(d >= today and not flow_logged and cycle_day <= model.avg_period),
        is_fertile=f_start <= cycle_day <= f_end,
        is_ovulation=cycle_day == ovulation_day(length),
    )


def summarize(model: CycleModel, today: date) -> dict:
    base = dict(
        today=today,
        avg_cycle_length=model.avg_cycle,
        avg_period_length=model.avg_period,
        cycles_used=model.cycles_used,
    )
    if not model.starts:
        return dict(
            **base, has_data=False, cycle_day=None, days_late=0, next_period_in=None, phase=None,
            ovulation_day=None, fertile_start=None, fertile_end=None, last_period_start=None,
        )
    last = model.starts[-1]
    next_start = last + timedelta(days=model.avg_cycle)
    f_start, f_end = fertile_range(model.avg_cycle)
    cycle_day = (today - last).days + 1   # not capped: a late period keeps counting
    return dict(
        **base,
        has_data=True,
        cycle_day=cycle_day,
        days_late=max(0, (today - next_start).days),
        next_period_in=max(0, (next_start - today).days),
        ovulation_day=ovulation_day(model.avg_cycle),
        fertile_start=f_start,
        fertile_end=f_end,
        last_period_start=last,
        phase=phase_for(cycle_day, model.avg_cycle, model.avg_period),
    )

def phase_for(cycle_day: int, cycle_len: int, period_len: int) -> str:
    """Rough phase name for a cycle day (calendar method, same caveats as the rest of this file)."""
    o = ovulation_day(cycle_len)
    if cycle_day <= period_len:
        return "menstrual"
    if cycle_day < o - 1:
        return "follicular"
    if cycle_day <= o + 1:
        return "ovulatory"
    return "luteal"