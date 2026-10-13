"""
Sudoku Solver — desktop version (tkinter).

This is where the project started: a backtracking solver with a small GUI.
The browser game in the parent folder grew out of it.

Improvements over the first version:
  * input is validated while typing (only a single digit 1-9 per cell),
  * the solver picks the cell with the fewest candidates first (much faster),
  * "no solution" and "conflicting digits" are reported instead of silently failing,
  * solved digits are shown in blue so you can tell them apart from your input,
  * proper 3x3 box borders and keyboard navigation with the arrow keys.

Run:  python sudoku_solver.py
"""
import tkinter as tk
from tkinter import messagebox

Board = list[list[int]]

ACCENT = "#2f8fdc"
GIVEN = "#1b2433"
BOX_BORDER = "#3a4659"


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------
def candidates(board: Board, row: int, col: int) -> set[int]:
    """Digits that can legally go into board[row][col]."""
    used = set(board[row]) | {board[r][col] for r in range(9)}
    br, bc = 3 * (row // 3), 3 * (col // 3)
    used |= {board[r][c] for r in range(br, br + 3) for c in range(bc, bc + 3)}
    return set(range(1, 10)) - used


def find_conflicts(board: Board) -> set[tuple[int, int]]:
    """Cells whose digit repeats in the same row, column or 3x3 box."""
    conflicts = set()
    units = (
        [[(r, c) for c in range(9)] for r in range(9)]
        + [[(r, c) for r in range(9)] for c in range(9)]
        + [[(br + r, bc + c) for r in range(3) for c in range(3)]
           for br in (0, 3, 6) for bc in (0, 3, 6)]
    )
    for unit in units:
        seen: dict[int, tuple[int, int]] = {}
        for r, c in unit:
            v = board[r][c]
            if not v:
                continue
            if v in seen:
                conflicts.update({(r, c), seen[v]})
            else:
                seen[v] = (r, c)
    return conflicts


def solve(board: Board) -> bool:
    """Solves the board in place with backtracking. Returns False if impossible."""
    best, best_cands = None, None
    for r in range(9):
        for c in range(9):
            if board[r][c] == 0:
                cands = candidates(board, r, c)
                if not cands:
                    return False
                if best_cands is None or len(cands) < len(best_cands):
                    best, best_cands = (r, c), cands
                    if len(cands) == 1:
                        break
        if best_cands is not None and len(best_cands) == 1:
            break

    if best is None:
        return True  # no empty cells left

    r, c = best
    for digit in best_cands:
        board[r][c] = digit
        if solve(board):
            return True
    board[r][c] = 0
    return False


# ---------------------------------------------------------------------------
# GUI
# ---------------------------------------------------------------------------
class SudokuApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        root.title("Sudoku Solver")
        root.resizable(False, False)
        root.configure(padx=16, pady=16, bg="white")

        validate = (root.register(self._valid_input), "%P")
        grid = tk.Frame(root, bg=BOX_BORDER, padx=2, pady=2)
        grid.grid(row=0, column=0, columnspan=2)

        self.entries: list[list[tk.Entry]] = []
        for br in range(3):
            for bc in range(3):
                box = tk.Frame(grid, bg="#d5dde8")
                box.grid(row=br, column=bc, padx=1, pady=1)
        for r in range(9):
            row = []
            for c in range(9):
                box = grid.grid_slaves(row=r // 3, column=c // 3)[0]
                e = tk.Entry(
                    box, width=2, justify="center", font=("Helvetica", 22),
                    relief="flat", fg=GIVEN, highlightthickness=1,
                    highlightbackground="#d5dde8", highlightcolor=ACCENT,
                    validate="key", validatecommand=validate,
                )
                e.grid(row=r % 3, column=c % 3, ipady=6)
                e.bind("<Key>", lambda ev, r=r, c=c: self._on_key(ev, r, c))
                row.append(e)
            self.entries.append(row)

        buttons = tk.Frame(root, bg="white", pady=12)
        buttons.grid(row=1, column=0, columnspan=2)
        tk.Button(buttons, text="Solve", width=10, command=self.solve_board).pack(side="left", padx=4)
        tk.Button(buttons, text="Clear", width=10, command=self.clear_board).pack(side="left", padx=4)

        self.entries[0][0].focus_set()

    @staticmethod
    def _valid_input(value: str) -> bool:
        return value == "" or (len(value) == 1 and value in "123456789")

    def _on_key(self, event: tk.Event, r: int, c: int) -> None:
        moves = {"Up": (-1, 0), "Down": (1, 0), "Left": (0, -1), "Right": (0, 1)}
        if event.keysym in moves:
            dr, dc = moves[event.keysym]
            self.entries[(r + dr) % 9][(c + dc) % 9].focus_set()

    def read_board(self) -> Board:
        return [[int(e.get()) if e.get() else 0 for e in row] for row in self.entries]

    def solve_board(self) -> None:
        board = self.read_board()
        for r, c in [(r, c) for r in range(9) for c in range(9)]:
            self.entries[r][c].configure(bg="white")

        conflicts = find_conflicts(board)
        if conflicts:
            for r, c in conflicts:
                self.entries[r][c].configure(bg="#fdecec")
            messagebox.showerror("Invalid board", "Some digits repeat in a row, column or box.")
            return

        original = [row[:] for row in board]
        if not solve(board):
            messagebox.showinfo("No solution", "This puzzle has no solution.")
            return

        for r in range(9):
            for c in range(9):
                if not original[r][c]:
                    e = self.entries[r][c]
                    e.insert(0, str(board[r][c]))
                    e.configure(fg=ACCENT)

    def clear_board(self) -> None:
        for row in self.entries:
            for e in row:
                e.delete(0, tk.END)
                e.configure(fg=GIVEN, bg="white")
        self.entries[0][0].focus_set()


if __name__ == "__main__":
    root = tk.Tk()
    SudokuApp(root)
    root.mainloop()
