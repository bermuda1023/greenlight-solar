import React, { useEffect } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/plugins/monthSelect/style.css";

type MonthYearPickerProps = {
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
};

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({ value, onChange }) => {
  useEffect(() => {
    // Initialize flatpickr with month/year only configuration
    const picker = flatpickr(".month-year-picker", {
      plugins: [
        new (require("flatpickr/dist/plugins/monthSelect"))({
          shorthand: false, // Show full month names
          dateFormat: "F Y", // Format as "January 2025"
          altFormat: "F Y", // Alternative display format
        }),
      ],
      enableTime: false,
      static: true,
      disableMobile: true,
      onClose: (selectedDates) => {
        // Call the parent's onChange with formatted month and year
        if (selectedDates[0]) {
          const formattedDate = selectedDates[0].toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
          onChange({
            target: { name: "billPeriod", value: formattedDate },
          });
        }
      },
    });

    // Cleanup
    return () => {
      (picker as flatpickr.Instance).destroy();
    };
  }, [onChange]);

  return (
    <div className="relative">
      <input
        type="text"
        className="month-year-picker w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
        placeholder="Select Month and Year"
        value={value}
        readOnly
      />
      <div className="pointer-events-none absolute inset-0 left-auto right-5 flex items-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.83268 1.45825C6.17786 1.45825 6.45768 1.73807 6.45768 2.08325V2.71885C7.00935 2.70824 7.61712 2.70825 8.28556 2.70825H11.713C12.3815 2.70825 12.9893 2.70824 13.541 2.71885V2.08325C13.541 1.73807 13.8208 1.45825 14.166 1.45825C14.5112 1.45825 14.791 1.73807 14.791 2.08325V2.77249C15.0076 2.78901 15.2128 2.80977 15.4069 2.83586C16.3839 2.96722 17.1747 3.24398 17.7983 3.86762C18.4219 4.49126 18.6987 5.28205 18.8301 6.25907C18.9577 7.2084 18.9577 8.42142 18.9577 9.95287V11.7136C18.9577 13.245 18.9577 14.4581 18.8301 15.4074C18.6987 16.3845 18.4219 17.1752 17.7983 17.7989C17.1747 18.4225 16.3839 18.6993 15.4069 18.8306C14.4575 18.9583 13.2445 18.9583 11.7131 18.9583H8.28567C6.75422 18.9583 5.54117 18.9583 4.59183 18.8306C3.61481 18.6993 2.82402 18.4225 2.20039 17.7989C1.57675 17.1752 1.29998 16.3845 1.16863 15.4074C1.04099 14.4581 1.041 13.2451 1.04102 11.7136V9.9529C1.041 8.42144 1.04099 7.20841 1.16863 6.25907C1.29998 5.28205 1.57675 4.49126 2.20039 3.86762C2.82402 3.24398 3.61481 2.96722 4.59183 2.83586C4.78594 2.80977 4.99106 2.78901 5.20768 2.77249V2.08325C5.20768 1.73807 5.48751 1.45825 5.83268 1.45825Z"
            fill="#9CA3AF"
          />
        </svg>
      </div>
    </div>
  );
};

export default MonthYearPicker;
