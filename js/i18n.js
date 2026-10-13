/* UI translations (English / Polish). */
(function (root) {
  'use strict';

  const STRINGS = {
    en: {
      'app.tagline': 'Classic number puzzle',
      'mode.easy': 'Easy',
      'mode.medium': 'Medium',
      'mode.hard': 'Hard',
      'mode.expert': 'Expert',
      'mode.daily': 'Daily',
      'mode.custom': 'Custom',
      'mode.create': 'Create',
      'mode.dailyTitle': 'Daily challenge',

      'info.mistakes': 'Mistakes',
      'info.hints': 'Hints',

      'action.undo': 'Undo',
      'action.redo': 'Redo',
      'action.erase': 'Erase',
      'action.notes': 'Notes',
      'action.hint': 'Hint',
      'action.pause': 'Pause',
      'action.resume': 'Resume',
      'action.restart': 'Restart',
      'action.newGame': 'New game',
      'action.on': 'On',
      'action.off': 'Off',

      'create.title': 'Create or solve your own puzzle',
      'create.help': 'Type in the digits from a puzzle (newspaper, book, app…). The solver tells you if it has exactly one solution — then you can play it or solve it instantly.',
      'create.solve': 'Solve',
      'create.play': 'Play this puzzle',
      'create.clear': 'Clear',
      'create.status.empty': 'Enter at least 17 digits.',
      'create.status.few': '{n} digits — a proper sudoku needs at least 17.',
      'create.status.conflict': 'Some digits clash — fix the red cells.',
      'create.status.none': 'This puzzle has no solution.',
      'create.status.multiple': 'This puzzle has more than one solution.',
      'create.status.unique': 'Valid puzzle with a unique solution ✓',
      'create.status.timeout': 'Too complex to verify quickly.',
      'create.solved': 'Solved! Blue digits are the solution.',

      'paused.title': 'Paused',
      'paused.text': 'Take a breather. The clock is stopped.',

      'win.title': 'Solved!',
      'win.text': 'Nicely done. Here is how it went:',
      'win.time': 'Time',
      'win.mistakes': 'Mistakes',
      'win.hints': 'Hints',
      'win.record': 'New best time!',
      'win.dailyDone': 'Daily challenge complete — come back tomorrow for a new one.',

      'lost.title': 'Out of mistakes',
      'lost.text': 'You made 3 mistakes. Try the same puzzle again or start a fresh one.',
      'lost.retry': 'Try again',

      'confirm.title': 'Start a new game?',
      'confirm.text': 'Your current progress will be lost.',
      'confirm.restartTitle': 'Restart this puzzle?',
      'confirm.restartText': 'All your digits and notes will be cleared.',
      'confirm.ok': 'Yes, continue',
      'confirm.cancel': 'Cancel',

      'stats.title': 'Statistics',
      'stats.played': 'Played',
      'stats.won': 'Won',
      'stats.winRate': 'Win rate',
      'stats.best': 'Best time',
      'stats.avg': 'Avg. time',
      'stats.dailyStreak': 'Daily streak',
      'stats.reset': 'Reset statistics',
      'stats.resetConfirm': 'Reset all statistics? This cannot be undone.',

      'settings.title': 'Settings',
      'settings.mistakes': 'Highlight mistakes',
      'settings.mistakesHint': 'Wrong digits turn red and count as mistakes.',
      'settings.limit': 'Limit to 3 mistakes',
      'settings.limitHint': 'The game ends after the third mistake.',
      'settings.area': 'Highlight row, column and box',
      'settings.same': 'Highlight identical digits',
      'settings.autoNotes': 'Auto-remove notes',
      'settings.autoNotesHint': 'Placing a digit removes it from notes in the same row, column and box.',
      'settings.timer': 'Show timer',
      'settings.theme': 'Theme',
      'settings.themeAuto': 'Auto',
      'settings.themeLight': 'Light',
      'settings.themeDark': 'Dark',
      'settings.language': 'Language',

      'help.title': 'How to play',
      'help.rules': 'Fill the grid so that every row, every column and every 3×3 box contains the digits 1–9 exactly once.',
      'help.controls': 'Controls',
      'help.k.digits': 'Enter a digit',
      'help.k.shift': 'Toggle a note',
      'help.k.erase': 'Erase',
      'help.k.move': 'Move the selection',
      'help.k.notes': 'Notes mode on/off',
      'help.k.undo': 'Undo / Redo',
      'help.k.hint': 'Hint',
      'help.k.pause': 'Pause',
      'help.tips': 'Tip: tap a digit on the pad with no cell selected to highlight it on the board.',

      'toast.hintNoCell': 'Nothing left to hint — the board is complete.',
      'toast.fullWrong': 'The board is full, but something is not right.',
      'toast.copied': 'Copied!',
      'toast.given': 'This digit is part of the puzzle.',
      'toast.saved': 'Progress is saved automatically.',
      'toast.offline': 'Ready to play offline.',

      'cell.label': 'Row {r}, column {c}',
      'cell.empty': 'empty',
      'cell.given': 'given',
      'theme.toggle': 'Toggle dark mode',
      'lang.toggle': 'Change language',
      'footer.text': 'Made with plain HTML, CSS & JavaScript',
    },

    pl: {
      'app.tagline': 'Klasyczna łamigłówka liczbowa',
      'mode.easy': 'Łatwy',
      'mode.medium': 'Średni',
      'mode.hard': 'Trudny',
      'mode.expert': 'Ekspert',
      'mode.daily': 'Dzienne',
      'mode.custom': 'Własne',
      'mode.create': 'Stwórz',
      'mode.dailyTitle': 'Wyzwanie dnia',

      'info.mistakes': 'Błędy',
      'info.hints': 'Podpowiedzi',

      'action.undo': 'Cofnij',
      'action.redo': 'Ponów',
      'action.erase': 'Wymaż',
      'action.notes': 'Notatki',
      'action.hint': 'Podpowiedź',
      'action.pause': 'Pauza',
      'action.resume': 'Wznów',
      'action.restart': 'Od nowa',
      'action.newGame': 'Nowa gra',
      'action.on': 'Wł.',
      'action.off': 'Wył.',

      'create.title': 'Stwórz lub rozwiąż własne sudoku',
      'create.help': 'Wpisz cyfry z dowolnej łamigłówki (gazeta, książka, aplikacja…). Solver sprawdzi, czy ma dokładnie jedno rozwiązanie — wtedy możesz w nią zagrać albo od razu ją rozwiązać.',
      'create.solve': 'Rozwiąż',
      'create.play': 'Zagraj w to sudoku',
      'create.clear': 'Wyczyść',
      'create.status.empty': 'Wpisz co najmniej 17 cyfr.',
      'create.status.few': 'Cyfr: {n} — poprawne sudoku potrzebuje co najmniej 17.',
      'create.status.conflict': 'Niektóre cyfry się powtarzają — popraw czerwone pola.',
      'create.status.none': 'To sudoku nie ma rozwiązania.',
      'create.status.multiple': 'To sudoku ma więcej niż jedno rozwiązanie.',
      'create.status.unique': 'Poprawne sudoku z jednym rozwiązaniem ✓',
      'create.status.timeout': 'Zbyt złożone, by szybko to sprawdzić.',
      'create.solved': 'Rozwiązane! Niebieskie cyfry to rozwiązanie.',

      'paused.title': 'Pauza',
      'paused.text': 'Chwila oddechu. Zegar jest zatrzymany.',

      'win.title': 'Rozwiązane!',
      'win.text': 'Świetna robota. Tak Ci poszło:',
      'win.time': 'Czas',
      'win.mistakes': 'Błędy',
      'win.hints': 'Podpowiedzi',
      'win.record': 'Nowy rekord!',
      'win.dailyDone': 'Wyzwanie dnia zaliczone — wróć jutro po nowe.',

      'lost.title': 'Koniec szans',
      'lost.text': 'Popełniono 3 błędy. Spróbuj tej samej planszy jeszcze raz albo zacznij nową.',
      'lost.retry': 'Spróbuj ponownie',

      'confirm.title': 'Zacząć nową grę?',
      'confirm.text': 'Obecny postęp zostanie utracony.',
      'confirm.restartTitle': 'Zacząć tę planszę od nowa?',
      'confirm.restartText': 'Wszystkie wpisane cyfry i notatki zostaną usunięte.',
      'confirm.ok': 'Tak, kontynuuj',
      'confirm.cancel': 'Anuluj',

      'stats.title': 'Statystyki',
      'stats.played': 'Rozegrane',
      'stats.won': 'Wygrane',
      'stats.winRate': 'Skuteczność',
      'stats.best': 'Najlepszy czas',
      'stats.avg': 'Średni czas',
      'stats.dailyStreak': 'Seria dziennych',
      'stats.reset': 'Wyzeruj statystyki',
      'stats.resetConfirm': 'Wyzerować wszystkie statystyki? Tego nie da się cofnąć.',

      'settings.title': 'Ustawienia',
      'settings.mistakes': 'Pokazuj błędy',
      'settings.mistakesHint': 'Błędne cyfry zmieniają kolor na czerwony i liczą się jako błąd.',
      'settings.limit': 'Limit 3 błędów',
      'settings.limitHint': 'Gra kończy się po trzecim błędzie.',
      'settings.area': 'Podświetlaj wiersz, kolumnę i kwadrat',
      'settings.same': 'Podświetlaj takie same cyfry',
      'settings.autoNotes': 'Automatycznie usuwaj notatki',
      'settings.autoNotesHint': 'Wpisanie cyfry usuwa ją z notatek w tym samym wierszu, kolumnie i kwadracie.',
      'settings.timer': 'Pokazuj zegar',
      'settings.theme': 'Motyw',
      'settings.themeAuto': 'Auto',
      'settings.themeLight': 'Jasny',
      'settings.themeDark': 'Ciemny',
      'settings.language': 'Język',

      'help.title': 'Jak grać',
      'help.rules': 'Uzupełnij planszę tak, aby w każdym wierszu, każdej kolumnie i każdym kwadracie 3×3 znalazły się cyfry 1–9, każda dokładnie raz.',
      'help.controls': 'Sterowanie',
      'help.k.digits': 'Wpisz cyfrę',
      'help.k.shift': 'Dodaj/usuń notatkę',
      'help.k.erase': 'Wymaż',
      'help.k.move': 'Przesuń zaznaczenie',
      'help.k.notes': 'Tryb notatek wł./wył.',
      'help.k.undo': 'Cofnij / Ponów',
      'help.k.hint': 'Podpowiedź',
      'help.k.pause': 'Pauza',
      'help.tips': 'Wskazówka: kliknij cyfrę na klawiaturze, gdy żadne pole nie jest zaznaczone, aby podświetlić ją na planszy.',

      'toast.hintNoCell': 'Nie ma już czego podpowiadać — plansza jest pełna.',
      'toast.fullWrong': 'Plansza jest pełna, ale coś się nie zgadza.',
      'toast.copied': 'Skopiowano!',
      'toast.given': 'Ta cyfra jest częścią łamigłówki.',
      'toast.saved': 'Postęp zapisuje się automatycznie.',
      'toast.offline': 'Gotowe do gry offline.',

      'cell.label': 'Wiersz {r}, kolumna {c}',
      'cell.empty': 'puste',
      'cell.given': 'stała',
      'theme.toggle': 'Przełącz tryb ciemny',
      'lang.toggle': 'Zmień język',
      'footer.text': 'Zrobione w czystym HTML, CSS i JavaScript',
    },
  };

  let current = 'en';

  function t(key, vars) {
    let s = (STRINGS[current] && STRINGS[current][key]) || STRINGS.en[key] || key;
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  function setLanguage(lang) {
    current = STRINGS[lang] ? lang : 'en';
    document.documentElement.lang = current;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
      el.setAttribute('aria-label', t(el.dataset.i18nTitle));
    });
  }

  function detectLanguage() {
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('pl') ? 'pl' : 'en';
  }

  root.I18n = { t, setLanguage, detectLanguage, get language() { return current; }, languages: Object.keys(STRINGS) };
})(window);
