// ProgressBar.tsx - 현재 점수 및 진행도 표시
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCategoryStore } from "@/app/stores/useCategoryStore";
import { useProgressStore } from "@/app/stores/useProgressStore";
import { GRADE_MAP, GRADE_OPTIONS, TargetGrade } from "@/app/types/dashboard";
import { percentageToGrade } from "@/lib/calculations/gradeUtils";

export default function ProgressBar() {
  // Subscribe to categories to trigger re-render when they change
  const categories = useCategoryStore((state) => state.categories);
  const calcProgressStats = useCategoryStore(
    (state) => state.calcProgressStats
  );
  const currentTargetGrade = useProgressStore(
    (state) => state.currentTargetGrade
  );
  const setTargetGrade = useProgressStore((state) => state.setTargetGrade);
  const maxPossibleGrade = useProgressStore((state) => state.maxPossibleGrade);
  const minPossibleGrade = useProgressStore((state) => state.minPossibleGrade);
  const currentGrade = useProgressStore((state) => state.currentGrade);
  const calculateAllGrades = useProgressStore(
    (state) => state.calculateAllGrades
  );

  // Animated progress value
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Recalculate stats whenever categories change
  const stats = calcProgressStats();

  // Calculate max possible grade (with non-graded = 100)
  useEffect(() => {
    if (categories.length > 0) {
      calculateAllGrades(categories);
    }
  }, [categories]);

  // Animate progress bar
  useEffect(() => {
    const maxPercentage = Math.min(100, Math.max(0, maxPossibleGrade));
    let start = animatedProgress;
    const end = maxPercentage;
    const duration = 800; // ms
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setAnimatedProgress(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [maxPossibleGrade]);

  // Set initial target grade to highest achievable grade
  useEffect(() => {
    if (categories.length > 0 && maxPossibleGrade > 0) {
      // Find the highest achievable grade
      const achievableGrade = GRADE_OPTIONS.find((grade) => {
        const threshold = GRADE_MAP[grade as TargetGrade];
        return maxPossibleGrade >= threshold;
      });

      if (achievableGrade && achievableGrade !== currentTargetGrade) {
        setTargetGrade(achievableGrade as TargetGrade);
      }
    }
  }, [categories.length, maxPossibleGrade]); // Only run when categories are first loaded

  const maxPercentage = Math.min(100, Math.max(0, maxPossibleGrade));
  const targetThreshold = GRADE_MAP[currentTargetGrade];
  const pinPosition = targetThreshold; // Position in percentage

  const handleGradeClick = (grade: string) => {
    setTargetGrade(grade as any);
  };

  // Check if a grade is achievable
  const isGradeAchievable = (grade: string): boolean => {
    const threshold = GRADE_MAP[grade as TargetGrade];
    return maxPossibleGrade >= threshold;
  };

  const hasGrades = categories.some(
    (cat) =>
      cat.weight > 0 &&
      cat.items.some((item) => item.score !== null && item.score !== undefined)
  );

  return (
    <div className="card">
      <h3>Grade Range Projection</h3>

      {/* Where the grade stands now, and how far it can move */}
      <div className="grade-stats">
        <div className="grade-stat grade-stat--primary">
          <span className="grade-stat-label">Current Grade</span>
          <span className="grade-stat-value">
            {hasGrades ? `${currentGrade.toFixed(1)}%` : "—"}
          </span>
          <span className="grade-stat-sub">
            {hasGrades ? percentageToGrade(currentGrade) : "No graded work yet"}
          </span>
        </div>
        <div className="grade-stat">
          <span className="grade-stat-label">Lowest Possible</span>
          <span className="grade-stat-value">
            {minPossibleGrade.toFixed(1)}%
          </span>
          <span className="grade-stat-sub">0 on everything left</span>
        </div>
        <div className="grade-stat">
          <span className="grade-stat-label">Highest Possible</span>
          <span className="grade-stat-value">
            {Math.min(100, maxPossibleGrade).toFixed(1)}%
          </span>
          <span className="grade-stat-sub">100 on everything left</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar-wrapper">
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              id="maxFill"
              style={{
                width: `${animatedProgress}%`,
                transition: "width 0.3s ease-out",
              }}
            ></div>
          </div>
          <div
            className="progress-pin"
            id="targetPin"
            style={{ display: "flex", left: `${pinPosition}%` }}
          >
            <div
              className="progress-pin-label"
              id="targetPinLabel"
              title={`${currentTargetGrade} ≥ ${targetThreshold}%`}
            >
              {currentTargetGrade}
            </div>
            <Image
              src="/icons/pin.svg"
              alt="target"
              width={20}
              height={20}
              className="progress-pin-icon"
            />
          </div>
        </div>
      </div>

      {/* Grade Selection Buttons */}
      <div className="grade-select-hint">
        Select a target letter grade to see required strategy:
      </div>
      <div className="grade-options" id="gradeOptions">
        {GRADE_OPTIONS.map((grade) => {
          const achievable = isGradeAchievable(grade);
          return (
            <button
              key={grade}
              className={`grade-btn ${
                currentTargetGrade === grade ? "active" : ""
              } ${!achievable ? "disabled" : ""}`}
              data-grade={grade}
              onClick={() => achievable && handleGradeClick(grade)}
              disabled={!achievable}
              title={
                !achievable
                  ? `Cannot achieve ${grade} (Max: ${maxPossibleGrade.toFixed(
                      1
                    )}%)`
                  : ""
              }
            >
              {grade}
            </button>
          );
        })}
      </div>
    </div>
  );
}
