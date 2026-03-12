"""Interactive prompt helpers shared across the Model Health demo scripts."""


def pick_one(items, prompt, label_fn):
    """Display a numbered list and return the item the user selects."""
    for i, item in enumerate(items, 1):
        print(f"  {i}. {label_fn(item)}")
    while True:
        raw = input(f"{prompt} [1-{len(items)}]: ").strip()
        try:
            idx = int(raw) - 1
            if 0 <= idx < len(items):
                return items[idx]
        except ValueError:
            pass
        print(f"  Please enter a number between 1 and {len(items)}.")


def pick_multi(items, prompt, label_fn):
    """Display a numbered list and return the items the user selects (one or more)."""
    for i, item in enumerate(items, 1):
        print(f"  {i}. {label_fn(item)}")
    while True:
        raw = input(f"{prompt} (e.g. 1 2 3): ").strip()
        try:
            indices = [int(x) - 1 for x in raw.split()]
            selected = [items[i] for i in indices if 0 <= i < len(items)]
            if selected:
                return selected
        except (ValueError, IndexError):
            pass
        print(f"  Please enter one or more numbers between 1 and {len(items)}.")


def confirm(prompt, default=None):
    """Ask a yes/no question and return True for yes.

    Pass ``default=True`` to show ``[Y/n]`` (Enter accepts yes).
    Pass ``default=False`` to show ``[y/N]`` (Enter accepts no).
    Pass ``default=None`` (the default) to show ``[y/n]`` (Enter re-prompts).
    """
    if default is True:
        hint = "[Y/n]"
    elif default is False:
        hint = "[y/N]"
    else:
        hint = "[y/n]"
    while True:
        raw = input(f"{prompt} {hint}: ").strip().lower()
        if raw in ("y", "yes"):
            return True
        if raw in ("n", "no"):
            return False
        if raw == "" and default is not None:
            return default
        print("  Please enter y or n.")
