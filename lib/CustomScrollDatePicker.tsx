import React, { useState, useMemo, useCallback, useEffect} from "react";

interface CustomScrollDatePickerProps {
  id?: string;
  onChange: (date: Date) => void;
  defaultDate?: boolean;
  quickDate?: boolean;
  opacity?: number;
  itemExtent?: number;
  useMagnifier?: boolean;
  magnification?: number;
  startFromDate?: Date | null;
  textSize?: number;
  height?: number;
  backgroundColor?: string;
  primaryTextColor?: string;
  secondaryTextColor?: string;
  todayText?: string;
  yesterdayText?: string;
  formatMonthsNames?: ((monthIndex: number) => string) | string;
  minYear?: number;
  maxYear?: number;
  maxDate?: Date;
  minDate?: Date;
};

interface WheelColumnProps {
  id: string;
  options: (string | number)[];
  selectedIndex: number;
  onChange: (index: number) => void;
  itemExtent: number;
  height: number;
  magnification: number;
  useMagnifier: boolean;
  opacity: number;
  primaryTextColor: string;
  secondaryTextColor: string;
  textSize: number;
}

const defaultMonthNames = [
  "JAN","FEB","MAR","APR","MAY","JUN",
  "JUL","AUG","SEP","OCT","NOV","DEC",
];

const monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const getDaysInMonth = (month : number, year: number) =>
  (month === 1 && isLeapYear(year) ? 29 : monthDays[month]);

const getStyles = (id: string) => `
  #${id}.date-picker-container {
    padding: 32px 16px 16px 16px;
    border-radius: 8px;
  }

  #${id} .wheel-column {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%);
  }

  #${id} .wheel-column::-webkit-scrollbar {
    display: none;
  }

  #${id} .wheel-item {
    display: flex;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  #${id} .pickers-wrapper {
    display: flex;
    justify-content: center;
  }

  #${id} .quick-buttons {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 32px;
  }

  #${id} .quick-button {
    background: none;
    border: none;
    cursor: pointer;
  }
`;

const useInjectStyles = (id: string) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const styleId = `datepicker-styles-${id}`;
    if (document.getElementById(styleId)) return;

    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.innerHTML = getStyles(id);
    document.head.appendChild(styleTag);

    return () => {
      const tag = document.getElementById(styleId);
      if (tag) document.head.removeChild(tag);
    };
  }, [id]);
};

const WheelColumn = ({
  id,
  options,
  selectedIndex,
  onChange,
  itemExtent,
  height,
  magnification,
  useMagnifier,
  opacity,
  primaryTextColor,
  secondaryTextColor,
  textSize,
}: WheelColumnProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  // Initial scroll on mount
  React.useEffect(() => {
    if (containerRef.current && !mounted) {
      containerRef.current.scrollTop = selectedIndex * itemExtent;
      setMounted(true);
    }
  }, [selectedIndex, itemExtent]);

  // Sync scroll position when selectedIndex changes
  React.useEffect(() => {
    if (containerRef.current && mounted) {
      containerRef.current.scrollTo({
        top: selectedIndex * itemExtent,
        behavior: "smooth",
      });
    }
  }, [selectedIndex, itemExtent, mounted]);

  // Snap on scroll end
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const rawIndex = Math.round(el.scrollTop / itemExtent);
        const newIndex = Math.max(0, Math.min(options.length - 1, rawIndex));
        el.scrollTo({ top: newIndex * itemExtent, behavior: "smooth" });
        if (newIndex !== selectedIndex) onChange(newIndex);
      }, 100);
    };

    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, [itemExtent, options.length, selectedIndex, onChange]);

  return (
    <div
      ref={containerRef}
      className="wheel-column"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        height,
        touchAction: 'pan-y',
      }}
    >
      {/* top spacer */}
      <div style={{ height: height / 2 - itemExtent / 2 }} />

      {options.map((opt, index) => {
        const isSelected = index === selectedIndex;
        return (
          <div
            key={index}
            className="wheel-item"
            onClick={() => {
              const el = containerRef.current;
              if (el) {
                el.scrollTo({
                  top: index * itemExtent,
                  behavior: "smooth",
                });
              }
              onChange(index);
            }}
            style={{
              height: itemExtent,
              fontSize: textSize,
              fontWeight: isSelected ? "bold" : "normal",
              color: isSelected ? primaryTextColor : secondaryTextColor,
              transform: `scale(${
                isSelected && useMagnifier ? magnification : 1
              })`,
              opacity: isSelected ? 1 : opacity,
            }}
          >
            {opt}
          </div>
        );
      })}

      {/* bottom spacer */}
      <div style={{ height: height / 2 - itemExtent / 2 }} />
    </div>
  );
};

const CustomScrollDatePicker : React.FC<CustomScrollDatePickerProps> =  ({
  id: providedId,
  onChange,
  defaultDate = true,
  quickDate = true,
  opacity = 0.5,
  itemExtent = 40,
  useMagnifier = true,
  magnification = 1.5,
  startFromDate,
  textSize = 18,
  height = 120,
  backgroundColor = "#fff",
  primaryTextColor = "#000",
  secondaryTextColor = "#999",
  todayText = "Today",
  yesterdayText = "Yesterday",
  formatMonthsNames ,
  minYear = 1900,
  maxYear = new Date().getFullYear() + 1,
  maxDate,
  minDate,
}) => {
  const [id] = useState(() => providedId || `datepicker-${Math.random().toString(36).substr(2, 9)}`);
  useInjectStyles(id);

  const today = useMemo(() => new Date(), []);
  const effectiveMaxYear = useMemo(() => {
    if (maxDate) {
      return maxDate.getFullYear();
    }
    return maxYear;
  }, [maxDate, maxYear]);

  const effectiveMinYear = useMemo(() => {
    if (minDate) {
      return minDate.getFullYear();
    }
    return minYear;
  }, [minDate, minYear]);
  
  const initDate = useMemo(
    () => (defaultDate ? (startFromDate || today) : new Date(effectiveMinYear, 0, 1)),
    [defaultDate, startFromDate, effectiveMinYear]
  );

  const years = useMemo(() => {
    const allYears = Array.from({ length: effectiveMaxYear - effectiveMinYear + 1 }, (_, i) => effectiveMinYear + i);
    
    // Filter years based on minDate and maxDate
    return allYears.filter(year => {
      if (minDate && year < minDate.getFullYear()) return false;
      if (maxDate && year > maxDate.getFullYear()) return false;
      return true;
    });
  }, [effectiveMinYear, effectiveMaxYear, minDate, maxDate]);

  const [selectedDate, setSelectedDate] = useState(initDate);
  const [dayIndex, setDayIndex] = useState(() => {
    const currentYear = initDate.getFullYear();
    const currentMonth = initDate.getMonth();
    let minDay = 1;
    
    if (minDate && currentYear === minDate.getFullYear() && currentMonth === minDate.getMonth()) {
      minDay = minDate.getDate();
    }
    
    return initDate.getDate() - minDay;
  });
  const [monthIndex, setMonthIndex] = useState(() => {
    const currentYear = initDate.getFullYear();
    let startMonth = 0;
    
    if (minDate && currentYear === minDate.getFullYear()) {
      startMonth = minDate.getMonth();
    }
    
    return initDate.getMonth() - startMonth;
  });
  const [yearIndex, setYearIndex] = useState(() => {
    const actualYear = initDate.getFullYear();
    const minYear = minDate ? minDate.getFullYear() : effectiveMinYear;
    return actualYear - minYear;
  });

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isToday = selectedDate.toDateString() === today.toDateString();
  const isYesterday = selectedDate.toDateString() === yesterday.toDateString();

  // Helper to get actual month index from filtered monthIndex
  const getActualMonthIndex = useCallback(() => {
    const currentYear = years[yearIndex];
    let startMonth = 0;
    
    if (minDate && currentYear === minDate.getFullYear()) {
      startMonth = minDate.getMonth();
    }
    
    return startMonth + monthIndex;
  }, [years, yearIndex, monthIndex, minDate]);

  const daysInMonth = getDaysInMonth(monthIndex, years[yearIndex]);
  const dayOptions = useMemo(() => {
    const currentYear = years[yearIndex];
    const actualMonthIndex = getActualMonthIndex();
    let maxDay = getDaysInMonth(actualMonthIndex, currentYear);
    let minDay = 1;
    
    // Constrain max day if we're in maxDate's month/year
    if (maxDate && currentYear === maxDate.getFullYear() && actualMonthIndex === maxDate.getMonth()) {
      maxDay = Math.min(maxDay, maxDate.getDate());
    }
    
    // Constrain min day if we're in minDate's month/year
    if (minDate && currentYear === minDate.getFullYear() && actualMonthIndex === minDate.getMonth()) {
      minDay = Math.max(minDay, minDate.getDate());
    }
    
    return Array.from({ length: maxDay - minDay + 1 }, (_, i) => minDay + i);
  }, [years, yearIndex, monthIndex, maxDate, minDate, getActualMonthIndex]);

  const monthOptions = useMemo(() => {
    const currentYear = years[yearIndex];
    let months: string[] = [];
    
    if (typeof formatMonthsNames === 'function') {
      months = defaultMonthNames.map((_, i) => formatMonthsNames(i));
    } else {
      months = defaultMonthNames;
    }
    
    // Filter months based on maxDate and minDate
    let startMonth = 0;
    let endMonth = 11;
    
    if (maxDate && currentYear === maxDate.getFullYear()) {
      endMonth = maxDate.getMonth();
    }
    
    if (minDate && currentYear === minDate.getFullYear()) {
      startMonth = minDate.getMonth();
    }
    
    return months.slice(startMonth, endMonth + 1);
  }, [formatMonthsNames, years, yearIndex, maxDate, minDate]);

  const updateDate = useCallback(
    (d: number, m: number, y: number) => {
      let newDate = new Date(y, m, d);
      
      // Enforce maxDate constraint
      if (maxDate && newDate > maxDate) {
        newDate = new Date(maxDate);
      }
      
      // Enforce minDate constraint
      if (minDate && newDate < minDate) {
        newDate = new Date(minDate);
      }
      
      setSelectedDate(newDate);
    },
    [maxDate, minDate]
  );

  useEffect(() => {
      onChange?.(selectedDate);
    }, [selectedDate]);

  const handleDayChange = (index: number) => {
    const currentYear = years[yearIndex];
    const currentMonth = getActualMonthIndex();
    let minDay = 1;
    
    if (minDate && currentYear === minDate.getFullYear() && currentMonth === minDate.getMonth()) {
      minDay = minDate.getDate();
    }
    
    const proposedDay = dayOptions[index];
    setDayIndex(index);
    updateDate(proposedDay, currentMonth, currentYear);
  };
  
  const handleMonthChange = (index: number) => {
    const proposedYear = years[yearIndex];
    let startMonth = 0;
    
    if (minDate && proposedYear === minDate.getFullYear()) {
      startMonth = minDate.getMonth();
    }
    
    const actualMonthIndex = startMonth + index;
    setMonthIndex(index);
    
    const maxDay = getDaysInMonth(actualMonthIndex, proposedYear);
    let minDay = 1;
    let constrainedMaxDay = maxDay;
    
    // Constrain day range for the new month
    if (maxDate && proposedYear === maxDate.getFullYear() && actualMonthIndex === maxDate.getMonth()) {
      constrainedMaxDay = Math.min(maxDay, maxDate.getDate());
    }
    
    if (minDate && proposedYear === minDate.getFullYear() && actualMonthIndex === minDate.getMonth()) {
      minDay = minDate.getDate();
    }
    
    // Get current selected day value
    const currentDayValue = dayOptions[dayIndex];
    let newDayValue = Math.min(Math.max(currentDayValue, minDay), constrainedMaxDay);
    let newDayIndex = newDayValue - minDay;
    
    setDayIndex(newDayIndex);
    updateDate(newDayValue, actualMonthIndex, proposedYear);
  };
  const handleYearChange = (index: number) => {
    const proposedYear = years[index];
    setYearIndex(index);
    
    // Recalculate month constraints for new year
    let startMonth = 0;
    let endMonth = 11;
    
    if (maxDate && proposedYear === maxDate.getFullYear()) {
      endMonth = maxDate.getMonth();
    }
    
    if (minDate && proposedYear === minDate.getFullYear()) {
      startMonth = minDate.getMonth();
    }
    
    // Get current actual month
    const oldActualMonth = getActualMonthIndex();
    
    // Constrain to new valid range
    let newActualMonth = Math.min(Math.max(oldActualMonth, startMonth), endMonth);
    let newMonthIndex = newActualMonth - startMonth;
    
    setMonthIndex(newMonthIndex);
    
    // Recalculate day constraints
    const maxDay = getDaysInMonth(newActualMonth, proposedYear);
    let minDay = 1;
    let constrainedMaxDay = maxDay;
    
    if (maxDate && proposedYear === maxDate.getFullYear() && newActualMonth === maxDate.getMonth()) {
      constrainedMaxDay = Math.min(maxDay, maxDate.getDate());
    }
    
    if (minDate && proposedYear === minDate.getFullYear() && newActualMonth === minDate.getMonth()) {
      minDay = minDate.getDate();
    }
    
    // Get current day value and constrain it
    const currentDayValue = dayOptions[dayIndex] || 1;
    let newDayValue = Math.min(Math.max(currentDayValue, minDay), constrainedMaxDay);
    let newDayIndex = newDayValue - minDay;
    
    setDayIndex(newDayIndex);
    updateDate(newDayValue, newActualMonth, proposedYear);
  };

  // quick actions
  const setToToday = () => {
    const d = new Date();
    const currentYear = d.getFullYear();
    const currentMonth = d.getMonth();
    
    let startMonth = 0;
    if (minDate && currentYear === minDate.getFullYear()) {
      startMonth = minDate.getMonth();
    }
    
    let minDay = 1;
    if (minDate && currentYear === minDate.getFullYear() && currentMonth === minDate.getMonth()) {
      minDay = minDate.getDate();
    }
    
    const minYear = minDate ? minDate.getFullYear() : effectiveMinYear;
    
    setDayIndex(d.getDate() - minDay);
    setMonthIndex(currentMonth - startMonth);
    setYearIndex(currentYear - minYear);
    updateDate(d.getDate(), currentMonth, currentYear);
  };

  const setToYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const currentYear = d.getFullYear();
    const currentMonth = d.getMonth();
    
    let startMonth = 0;
    if (minDate && currentYear === minDate.getFullYear()) {
      startMonth = minDate.getMonth();
    }
    
    let minDay = 1;
    if (minDate && currentYear === minDate.getFullYear() && currentMonth === minDate.getMonth()) {
      minDay = minDate.getDate();
    }
    
    const minYear = minDate ? minDate.getFullYear() : effectiveMinYear;
    
    setDayIndex(d.getDate() - minDay);
    setMonthIndex(currentMonth - startMonth);
    setYearIndex(currentYear - minYear);
    updateDate(d.getDate(), currentMonth, currentYear);
  };

  return (
    <div
      id={id}
      className="date-picker-container"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        backgroundColor,
        color: primaryTextColor,
        touchAction: 'pan-y',
      }}
    >
      {/* Pickers */}
      <div
        className="pickers-wrapper"
        style={{
          marginBottom: quickDate ? "32px" : "16px",
        }}
      >
        <WheelColumn
          id={id}
          options={dayOptions}
          selectedIndex={dayIndex}
          onChange={handleDayChange}
          {...{
            itemExtent,
            height,
            magnification,
            useMagnifier,
            opacity,
            primaryTextColor,
            secondaryTextColor,
            textSize,
          }}
        />
        <WheelColumn
          id={id}
          options={monthOptions}
          selectedIndex={monthIndex}
          onChange={handleMonthChange}
          {...{
            itemExtent,
            height,
            magnification,
            useMagnifier,
            opacity,
            primaryTextColor,
            secondaryTextColor,
            textSize,
          }}
        />
        <WheelColumn
          id={id}
          options={years}
          selectedIndex={yearIndex}
          onChange={handleYearChange}
          {...{
            itemExtent,
            height,
            magnification,
            useMagnifier,
            opacity,
            primaryTextColor,
            secondaryTextColor,
            textSize,
          }}
        />
      </div>

      {/* Quick buttons */}
      {quickDate && (
        <div className="quick-buttons">
          <button
            className="quick-button"
            onClick={setToYesterday}
            style={{
              color: isYesterday ? primaryTextColor : secondaryTextColor,
              fontSize: textSize * 0.8,
            }}
          >
            {yesterdayText}
          </button>
          <button
            className="quick-button"
            onClick={setToToday}
            style={{
              color: isToday ? primaryTextColor : secondaryTextColor,
              fontSize: textSize * 0.8,
            }}
          >
            {todayText}
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomScrollDatePicker;
