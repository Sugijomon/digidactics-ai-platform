import { RequiredBadge } from "@/components/survey-ui";
import type { SurveyOption } from "@/lib/sai-survey/options";

export function SurveyCheckboxGroup({
  helpText,
  isDisabled = false,
  label,
  onChange,
  options,
  required = true,
  selectedCodes,
  validationError,
}: {
  helpText: string;
  isDisabled?: boolean;
  label: string;
  onChange: (codes: string[]) => void;
  options: SurveyOption[];
  required?: boolean;
  selectedCodes: string[];
  validationError?: string;
}) {
  function toggleCode(code: string) {
    onChange(
      selectedCodes.includes(code)
        ? selectedCodes.filter((selectedCode) => selectedCode !== code)
        : [...selectedCodes, code],
    );
  }

  return (
    <section
      className={`grid min-w-0 max-w-full gap-4 rounded-[1.35rem] border bg-white/75 p-4 shadow-[0_4px_14px_rgba(0,101,139,0.035)] ${
        validationError ? "border-red-300" : "border-white/80"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words font-bold text-[#00658b]">
              {label}
            </h3>
            {required ? <RequiredBadge /> : null}
          </div>
          <span className="rounded-full bg-[#c4e7ff]/50 px-2.5 py-1 text-xs font-bold text-[#00658b]">
            {selectedCodes.length} geselecteerd
          </span>
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-[#40484e]">
          {helpText}
        </p>
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-red-700">
            {validationError}
          </p>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        {options.map((option) => (
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
              selectedCodes.includes(option.code)
                ? "border-[#00658b] bg-[#f1f4f6]"
                : "border-[#bfc7cf] bg-white"
            } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
            key={option.code}
          >
            <input
              checked={selectedCodes.includes(option.code)}
              className="mt-0.5 h-5 w-5 accent-[#00658b]"
              disabled={isDisabled}
              onChange={() => toggleCode(option.code)}
              type="checkbox"
              value={option.code}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#181c1e]">
                {option.label}
              </span>
              {option.description ? (
                <span className="mt-1 block break-words text-xs leading-5 text-[#40484e]">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

export function SurveyRadioGroup({
  helpText,
  isDisabled = false,
  label,
  name,
  onChange,
  options,
  selectedCode,
  validationError,
}: {
  helpText: string;
  isDisabled?: boolean;
  label: string;
  name: string;
  onChange: (code: string) => void;
  options: SurveyOption[];
  selectedCode: string;
  validationError?: string;
}) {
  return (
    <section
      className={`grid min-w-0 max-w-full gap-4 rounded-[1.35rem] border bg-white/75 p-4 shadow-[0_4px_14px_rgba(0,101,139,0.035)] ${
        validationError ? "border-red-300" : "border-white/80"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words font-bold text-[#00658b]">
            {label}
          </h3>
          <RequiredBadge />
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-[#40484e]">
          {helpText}
        </p>
        {validationError ? (
          <p className="mt-2 text-sm font-semibold text-red-700">
            {validationError}
          </p>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        {options.map((option) => (
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#00658b] hover:shadow-[0_4px_12px_rgba(0,101,139,0.06)] ${
              selectedCode === option.code
                ? "border-[#00658b] bg-[#f1f4f6]"
                : "border-[#bfc7cf] bg-white"
            } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
            key={option.code}
          >
            <input
              checked={selectedCode === option.code}
              className="mt-0.5 h-5 w-5 accent-[#00658b]"
              disabled={isDisabled}
              name={name}
              onChange={() => onChange(option.code)}
              type="radio"
              value={option.code}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#181c1e]">
                {option.label}
              </span>
              {option.description ? (
                <span className="mt-1 block break-words text-xs leading-5 text-[#40484e]">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
