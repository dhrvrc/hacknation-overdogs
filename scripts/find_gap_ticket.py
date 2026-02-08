"""
Find a real gap ticket for copilot scenario 3.

Boots the engine, runs gap detection on a sample of tickets,
and prints tickets where is_gap=True sorted by module/category
so we can pick one with an interesting subject.

Usage:
    uv run python scripts/find_gap_ticket.py
"""
import sys

from meridian.main import boot


def main() -> None:
    print("Booting engine...")
    ds, vs, prov, gap, gen, evl = boot()

    print(f"\nScanning tickets for gaps (threshold={gap.threshold})...")
    results = gap.scan_all_tickets()

    gaps = [r for r in results if r.is_gap]
    print(f"\nFound {len(gaps)} gap tickets out of {len(results)} total\n")

    # Show top 20 gaps sorted by similarity (worst first)
    print(f"{'Ticket':<16} {'Sim':>5} {'Tier':>4} {'Module':<35} {'Category':<30}")
    print("-" * 100)
    for r in gaps[:20]:
        # Look up subject from datastore
        ticket = ds.ticket_by_number.get(r.ticket_number)
        subject = str(ticket.get("Subject", ""))[:40] if ticket is not None else ""
        print(
            f"{r.ticket_number:<16} {r.resolution_similarity:>5.3f} "
            f"{r.tier:>4} {r.module:<35} {r.category:<30}"
        )
        print(f"  Subject: {subject}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
