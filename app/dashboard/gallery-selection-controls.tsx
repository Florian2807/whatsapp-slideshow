"use client";

type GallerySelectionControlsProps = {
  formId: string;
};

function getSelectionInputs(formId: string) {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[data-gallery-selection][form="${formId}"]`,
    ),
  );
}

export function GallerySelectionControls({
  formId,
}: GallerySelectionControlsProps) {
  function updateSelection(checked: boolean) {
    for (const input of getSelectionInputs(formId)) {
      input.checked = checked;
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          updateSelection(true);
        }}
        title="Alle auswählen"
        aria-label="Alle auswählen"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
        <span>Alle</span>
      </button>
      <button
        type="button"
        onClick={() => {
          updateSelection(false);
        }}
        title="Auswahl leeren"
        aria-label="Auswahl leeren"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span>Keine</span>
      </button>
    </div>
  );
}
