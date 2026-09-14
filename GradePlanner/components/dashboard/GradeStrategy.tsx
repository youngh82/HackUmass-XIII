// GradeStrategy.tsx - Grade Strategy with sliders and projected grade
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useCategoryStore } from "@/app/stores/useCategoryStore";
import { useProgressStore } from "@/app/stores/useProgressStore";
import { AVAILABLE_STRATEGIES, StrategyType } from "@/app/types/strategy";

export default function GradeStrategy() {
  const categories = useCategoryStore((state) => state.categories);
  const currentTargetGrade = useProgressStore(
    (state) => state.currentTargetGrade
  );
  const ungradedItems = useProgressStore((state) => state.ungradedItems);
  const projectedGrade = useProgressStore((state) => state.projectedGrade);
  const maxPossibleGrade = useProgressStore((state) => state.maxPossibleGrade);
  const currentStrategy = useProgressStore((state) => state.currentStrategy);
  const collectUngradedItems = useProgressStore(
    (state) => state.collectUngradedItems
  );
  const calculateTotalDeductiblePoints = useProgressStore(
    (state) => state.calculateTotalDeductiblePoints
  );
  const updateSlider = useProgressStore((state) => state.updateSlider);
  const togglePin = useProgressStore((state) => state.togglePin);
  const calculateProjectedGrade = useProgressStore(
    (state) => state.calculateProjectedGrade
  );
  const calculateAllGrades = useProgressStore(
    (state) => state.calculateAllGrades
  );
  const setStrategy = useProgressStore((state) => state.setStrategy);

  // Local state for text input values
  const [inputValues, setInputValues] = useState<{ [key: number]: string }>({});

  // Track which input is currently being edited
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced slider change
  const debouncedCalculate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      calculateProjectedGrade(categories);
    }, 100); // 100ms debounce
  }, [calculateProjectedGrade, categories]);

  // Update ungraded items when categories change
  useEffect(() => {
    collectUngradedItems(categories);
  }, [categories, collectUngradedItems]);

  // Recalculate when target grade changes
  useEffect(() => {
    calculateTotalDeductiblePoints(categories);
  }, [currentTargetGrade, categories, calculateTotalDeductiblePoints]);

  // Recalculate when strategy changes
  useEffect(() => {
    if (categories.length > 0) {
      calculateTotalDeductiblePoints(categories);
    }
  }, [currentStrategy]);

  // Update projected grade when sliders change
  useEffect(() => {
    calculateProjectedGrade(categories);
  }, [ungradedItems, categories, calculateProjectedGrade]);

  // Update local input values when ungradedItems change
  useEffect(() => {
    const newInputValues: { [key: number]: string } = {};
    ungradedItems.forEach((item, index) => {
      // Don't update the input that's currently being edited (user is typing)
      // Always update pinned items and non-editing items
      if (editingIndex !== index) {
        newInputValues[index] = item.assumedScore.toFixed(1);
      }
    });
    if (Object.keys(newInputValues).length > 0) {
      setInputValues((prev) => ({ ...prev, ...newInputValues }));
    }
  }, [ungradedItems, editingIndex]);

  const handleSliderChange = (index: number, value: number) => {
    updateSlider(index, value);
    debouncedCalculate();

    // Sync input value with the actual result after redistribution
    // Use a timeout to ensure state has been updated
    setTimeout(() => {
      const item = ungradedItems[index];
      if (item) {
        setInputValues((prev) => ({
          ...prev,
          [index]: item.assumedScore.toFixed(1),
        }));
      }
    }, 10);
  };

  const handleResetSliders = () => {
    // Recalculate all sliders based on current strategy
    calculateTotalDeductiblePoints(categories);
    calculateProjectedGrade(categories);
  };

  const handleInputChange = (index: number, value: string) => {
    // Mark this input as being edited
    setEditingIndex(index);
    // Allow typing any value temporarily
    setInputValues((prev) => ({ ...prev, [index]: value }));
  };

  const handleInputBlur = (index: number) => {
    // Clear editing state
    setEditingIndex(null);

    const value = parseFloat(inputValues[index]);
    const item = ungradedItems[index];

    if (isNaN(value) || !item) {
      // Reset to current value if invalid
      setInputValues((prev) => ({
        ...prev,
        [index]: item?.assumedScore.toFixed(1) ?? "0.0",
      }));
    } else {
      // Clamp and update - handleSliderChange will sync the actual value
      const clampedValue = Math.max(0, Math.min(100, value));
      handleSliderChange(index, clampedValue);
    }
  };

  const handleInputKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handlePinToggle = (index: number) => {
    togglePin(index);
  };

  const handleStrategyChange = (strategyType: StrategyType) => {
    setStrategy(strategyType);
  };

  const hasUngradedItems = ungradedItems.length > 0;

  // Check if target is achievable
  const targetPercentage =
    { A: 93, "A-": 90, "B+": 87, B: 83, "B-": 80, "C+": 77, C: 73, "C-": 70 }[
      currentTargetGrade
    ] || 93;
  const isTargetAchievable = maxPossibleGrade >= targetPercentage;

  // Count attendance items
  const attendanceItems = ungradedItems.filter((item) => item.isAttendance);
  const attendanceNeeded = attendanceItems.filter(
    (item) => item.assumedScore === 1
  ).length;
  const attendanceTotal = attendanceItems.length;

  return (
    <>
      {/* Target Strategy Card */}
      {hasUngradedItems && (
        <div className="card" id="targetStrategy">
          {/* Goal Achievability Warning */}
          {!isTargetAchievable && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#fee2e2",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "18px" }}>⚠️</span>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#991b1b",
                      marginBottom: "4px",
                    }}
                  >
                    Target Grade Not Achievable
                  </div>
                  <div style={{ fontSize: "13px", color: "#7f1d1d" }}>
                    Maximum possible grade: {maxPossibleGrade.toFixed(1)}% (even
                    with 100% on all remaining items)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Info */}
          {attendanceItems.length > 0 && (
            <div
              style={{
                padding: "10px 12px",
                backgroundColor: "#dbeafe",
                border: "1px solid #3b82f6",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#1e40af",
              }}
            >
              📅 Attendance Required: <strong>{attendanceNeeded}</strong> out of{" "}
              <strong>{attendanceTotal}</strong> sessions
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 id="strategyTitle" style={{ margin: 0 }}>
              Strategy for {currentTargetGrade}
            </h3>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--txt-muted)",
                  marginBottom: "2px",
                }}
              >
                Projected Grade
              </div>
              <div
                id="projectedGrade"
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: isTargetAchievable ? "var(--accent)" : "#ef4444",
                }}
              >
                {projectedGrade.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Strategy Selection */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--txt-muted)",
                  fontWeight: 500,
                }}
              >
                Distribution Strategy:
              </div>
              <button
                className="btn btn-secondary"
                style={{
                  padding: "4px 12px",
                  fontSize: "12px",
                  height: "auto",
                }}
                onClick={handleResetSliders}
                title="Reset all sliders to strategy defaults"
              >
                Reset
              </button>
            </div>
            <div className="strategy-options">
              {AVAILABLE_STRATEGIES.map((strategy) => (
                <button
                  key={strategy.id}
                  className={`strategy-btn ${
                    currentStrategy === strategy.id ? "active" : ""
                  }`}
                  onClick={() => handleStrategyChange(strategy.id)}
                  aria-pressed={currentStrategy === strategy.id}
                >
                  {strategy.name}
                </button>
              ))}
            </div>
            {/* Always visible so the choice is understandable on touch devices */}
            <div
              style={{
                fontSize: "13px",
                color: "var(--txt-muted)",
                marginTop: "8px",
              }}
            >
              {
                AVAILABLE_STRATEGIES.find((s) => s.id === currentStrategy)
                  ?.description
              }
            </div>
          </div>

          <div
            id="ungradedItemsList"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {ungradedItems.map((item, index) => (
              <div
                key={`${item.categoryId}-${item.itemName}`}
                className="ungraded-item-slider"
                style={
                  item.isAttendance
                    ? {
                        border: "2px solid #3b82f6",
                        backgroundColor: "#eff6ff",
                      }
                    : undefined
                }
              >
                <div className="slider-header">
                  <div className="slider-item-info">
                    <div className="slider-item-text">
                      <div className="slider-item-name">
                        {item.isAttendance && "📅 "}
                        {item.itemName}
                        {item.assumedScore === 0 && item.isAttendance && (
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "12px",
                              color: "#dc2626",
                              fontWeight: 600,
                            }}
                          >
                            (Absent)
                          </span>
                        )}
                      </div>
                      <div className="slider-item-category">
                        {item.categoryName}
                        {item.isAttendance && (
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "11px",
                              color: "#3b82f6",
                            }}
                          >
                            • Attendance (0 or 100 only)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className={`pin-btn ${
                        item.isPinned ? "pin-btn--active" : ""
                      }`}
                      type="button"
                      onClick={() => handlePinToggle(index)}
                    >
                      <Image
                        src="/icons/pin-fill.svg"
                        alt="pin"
                        width={20}
                        height={20}
                      />
                    </button>
                  </div>
                  <input
                    type="text"
                    className="slider-value-input"
                    value={
                      item.isAttendance
                        ? item.assumedScore === 1
                          ? "100"
                          : "0"
                        : inputValues[index] ?? item.assumedScore.toFixed(1)
                    }
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onBlur={() => handleInputBlur(index)}
                    onKeyDown={(e) => handleInputKeyDown(index, e)}
                    disabled={item.isPinned}
                    readOnly={item.isAttendance}
                    style={
                      item.isAttendance
                        ? {
                            backgroundColor:
                              item.assumedScore === 1 ? "#dcfce7" : "#fee2e2",
                            color:
                              item.assumedScore === 1 ? "#166534" : "#991b1b",
                            fontWeight: 600,
                          }
                        : undefined
                    }
                  />
                </div>
                <input
                  type="range"
                  className="target-slider"
                  min="0"
                  max="100"
                  step={item.isAttendance ? "100" : "0.1"}
                  value={
                    item.isAttendance
                      ? item.assumedScore === 1
                        ? 100
                        : 0
                      : item.assumedScore
                  }
                  onChange={(e) =>
                    handleSliderChange(index, parseFloat(e.target.value))
                  }
                  disabled={item.isPinned || item.isAttendance}
                  style={
                    item.isAttendance
                      ? { opacity: 0.5, cursor: "not-allowed" }
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
