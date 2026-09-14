// SetupModal.tsx - Course Setup Modal
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSetupStore } from "@/app/stores/useSetupStore";
import { useCategoryStore } from "@/app/stores/useCategoryStore";
import SetupCategoryCard from "./SetupCategoryCard";

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SetupModal({ isOpen, onClose }: SetupModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [syllabusSuggestions, setSyllabusSuggestions] = useState<any[]>([]);

  const setupCategories = useSetupStore((state) => state.setupCategories);
  const addSetupCategory = useSetupStore((state) => state.addSetupCategory);
  const getTotalWeight = useSetupStore((state) => state.getTotalWeight);
  const setSetupCategories = useSetupStore((state) => state.setSetupCategories);

  const setCategories = useCategoryStore((state) => state.setCategories);
  const categories = useCategoryStore((state) => state.categories);

  // Close with Escape; the ref always points at the latest handleClose
  const closeRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setUploadStatus("");
    setSelectedFile(null);
    setIsUploading(false);
    setUploadError("");
    setSyllabusSuggestions([]);
    onClose();
  };
  closeRef.current = handleClose;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes("pdf")) {
        setUploadError("Please select a PDF file");
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File is too large. Maximum size is 10MB");
        return;
      }

      setSelectedFile(file);
      setUploadStatus(`✓ File selected: ${file.name}`);
      setUploadError("");
    }
  };

  const handleSkipToAnalysis = () => {
    setUploadStatus("");
    setUploadError("");

    // Load sample categories if store is empty
    if (setupCategories.length === 0) {
      const sampleCategories = [
        { id: 1, name: "Exams", weight: 40, count: 3 },
        { id: 2, name: "Homework", weight: 30, count: 10 },
        { id: 3, name: "Quizzes", weight: 20, count: 8 },
        { id: 4, name: "Participation", weight: 10, count: 1 },
      ];
      setSetupCategories(sampleCategories);
    }

    setStep(2);
  };

  const handleProceedToAnalysis = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadStatus("🔄 Uploading and analyzing syllabus...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/ai/parse-syllabus", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse syllabus");
      }

      // Parse syllabus categories
      if (result.data && result.data.categories) {
        const parsedCategories = result.data.categories.map(
          (cat: any, index: number) => ({
            id: index + 1,
            name: cat.name || "Untitled Category",
            weight: cat.weight || 0,
            count: cat.count || 1,
          })
        );

        // If Canvas data exists in setupCategories, merge with syllabus (Syllabus fills gaps)
        if (setupCategories.length > 0) {
          const mergedCategories = mergeSyllabusWithCanvas(
            setupCategories, // Use setupCategories (Canvas data)
            parsedCategories
          );
          setSetupCategories(mergedCategories);
          setUploadStatus(
            "✓ Syllabus merged with Canvas data! Review suggestions below."
          );
          setSyllabusSuggestions(parsedCategories);
        } else {
          // No Canvas data, use syllabus as primary source
          setSetupCategories(parsedCategories);
          setUploadStatus("✓ Syllabus parsed successfully!");
        }
      } else {
        setUploadStatus("⚠ Parsing completed but no categories found");
      }

      // Move to step 2 after a short delay
      setTimeout(() => {
        setStep(2);
      }, 1000);
    } catch (error) {
      console.error("Syllabus parsing error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to parse syllabus"
      );
      setUploadStatus("");
    } finally {
      setIsUploading(false);
    }
  };

  // Normalize category name for fuzzy matching
  const normalizeCategoryName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ") // Multiple spaces -> single space
      .replace(/[^a-z0-9\s]/g, "") // Remove special chars (hyphens, etc.)
      .replace(/\s/g, ""); // Remove all spaces for comparison
  };

  // Extract key terms from category name
  const extractKeyTerms = (name: string): string[] => {
    const normalized = name.toLowerCase().trim();

    // Common words to ignore
    const stopWords = ["the", "and", "or", "a", "an", "of", "in", "for", "to"];

    // Split into words and filter
    const words = normalized
      .split(/[\s\-_]+/)
      .filter((w) => w.length > 2 && !stopWords.includes(w));

    return words;
  };

  // Check if two category names are similar (fuzzy match)
  const isSimilarCategory = (name1: string, name2: string): boolean => {
    const norm1 = normalizeCategoryName(name1);
    const norm2 = normalizeCategoryName(name2);

    // Exact match after normalization
    if (norm1 === norm2) return true;

    // Extract key terms from both names
    const terms1 = extractKeyTerms(name1);
    const terms2 = extractKeyTerms(name2);

    // Check for core category keywords
    const categoryKeywords = {
      exam: ["exam", "test", "midterm", "final"],
      quiz: ["quiz", "quizzes"],
      lab: ["lab", "labs", "laboratory"],
      homework: ["homework", "hw", "assignment", "assignments"],
      project: ["project", "projects"],
      attendance: ["attendance", "participation"],
      zybooks: ["zybooks", "zybook"],
    };

    // Find category types for each name
    let type1: string | null = null;
    let type2: string | null = null;

    for (const [key, variations] of Object.entries(categoryKeywords)) {
      if (
        variations.some((v) =>
          terms1.some((t) => t.includes(v) || v.includes(t))
        )
      ) {
        type1 = key;
      }
      if (
        variations.some((v) =>
          terms2.some((t) => t.includes(v) || v.includes(t))
        )
      ) {
        type2 = key;
      }
    }

    // If both have the same category type, they're similar
    if (type1 && type2 && type1 === type2) return true;

    // Check for significant word overlap
    const commonTerms = terms1.filter((t1) =>
      terms2.some((t2) => t1.includes(t2) || t2.includes(t1))
    );

    // If they share 50%+ of terms, they're similar
    const minTerms = Math.min(terms1.length, terms2.length);
    if (minTerms > 0 && commonTerms.length >= minTerms * 0.5) return true;

    // Check if one contains the other (for simple cases like "Lab" vs "Labs")
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const minLength = Math.min(norm1.length, norm2.length);
      const maxLength = Math.max(norm1.length, norm2.length);

      // Allow if length difference is small (within 2x)
      if (maxLength <= minLength * 2) return true;
    }

    return false;
  };

  // Merge syllabus with Canvas data. Canvas categories stay the base (they
  // hold the real items), but the syllabus is the authority on weights:
  // Canvas weights are often 0 or only derived from points.
  const mergeSyllabusWithCanvas = (
    canvasCategories: any[],
    syllabusCategories: any[]
  ) => {
    // Weights over 100% mean Canvas has duplicated assignment groups
    const canvasWeightSum = canvasCategories.reduce(
      (sum, c) => sum + c.weight,
      0
    );
    if (canvasWeightSum > 100) {
      const seenNames = new Set<string>();
      canvasCategories = canvasCategories.filter((cat) => {
        const normalizedName = normalizeCategoryName(cat.name);
        if (seenNames.has(normalizedName)) return false;
        seenNames.add(normalizedName);
        return true;
      });
    }

    const merged = [...canvasCategories];
    // Canvas categories already given a syllabus weight; a second syllabus
    // match (e.g. "Midterm" and "Final" both → "Exams") adds to it
    const weightedFromSyllabus = new Set<number>();

    syllabusCategories.forEach((sylCat) => {
      const existingIndex = merged.findIndex((canvasCat) =>
        isSimilarCategory(canvasCat.name, sylCat.name)
      );

      if (existingIndex === -1) {
        // Only in the syllabus - add it
        merged.push({
          id: Math.max(...merged.map((c) => c.id), 0) + 1,
          name: sylCat.name,
          weight: sylCat.weight,
          count: sylCat.count,
        });
        return;
      }

      const canvasCat = merged[existingIndex];
      let weight = canvasCat.weight;
      if (sylCat.weight > 0) {
        weight = weightedFromSyllabus.has(existingIndex)
          ? canvasCat.weight + sylCat.weight
          : sylCat.weight;
        weightedFromSyllabus.add(existingIndex);
      }

      merged[existingIndex] = {
        ...canvasCat,
        weight,
        count: Math.max(canvasCat.count, sylCat.count),
      };
    });

    return merged;
  };

  const handleBackToUpload = () => {
    setStep(1);
  };

  const handleConfirmSetup = () => {
    if (!isWeightValid) return; // Confirm button is disabled in this case

    // Convert setup categories to dashboard categories. Existing items (and
    // their Canvas scores) are kept; placeholders only pad up to `count`.
    const newCategories = setupCategories.map((setupCat) => {
      const existing =
        categories.find((c) => c.id === setupCat.id) ??
        categories.find((c) => c.name === setupCat.name);
      const items = [...(existing?.items ?? [])];

      // Give placeholders the average points so point weighting still applies
      const points = items.flatMap((item) =>
        item.maxScore === undefined ? [] : [item.maxScore]
      );
      const avgPoints =
        points.length > 0 && points.length === items.length
          ? points.reduce((sum, p) => sum + p, 0) / points.length
          : undefined;

      for (let i = items.length; i < setupCat.count; i++) {
        items.push({
          name: `${setupCat.name} ${i + 1}`,
          score: null,
          ...(avgPoints !== undefined && { maxScore: avgPoints }),
        });
      }

      return {
        id: setupCat.id,
        name: setupCat.name,
        weight: setupCat.weight,
        items,
        _open: existing?._open ?? false,
      };
    });

    setCategories(newCategories);
    handleClose();
  };

  const totalWeight = getTotalWeight();
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content setup-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step 1: Syllabus Upload */}
        {step === 1 && (
          <div className="setup-step" id="step1">
            <div className="modal-header">
              <h2>Course Setup - Syllabus Upload</h2>
              <button onClick={handleClose} className="modal-close-btn">
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="setup-instruction">
                Upload your course syllabus PDF for automatic grading category
                detection using AI, or skip to enter categories manually.
              </p>

              {selectedFile && (
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "6px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: "14px" }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setUploadStatus("");
                      setUploadError("");
                    }}
                    style={{
                      padding: "4px 8px",
                      fontSize: "12px",
                      background: "white",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}

              <div
                className="upload-area"
                onClick={() =>
                  document.getElementById("syllabusFileUpload")?.click()
                }
                style={{
                  cursor: isUploading ? "not-allowed" : "pointer",
                  opacity: isUploading ? 0.6 : 1,
                }}
              >
                <div className="upload-icon">
                  <Image
                    src="/icons/file-upload.svg"
                    alt="Upload"
                    width={64}
                    height={64}
                  />
                </div>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 500,
                    margin: "12px 0 4px",
                  }}
                >
                  {selectedFile ? "Change file" : "Click to upload syllabus"}
                </p>
                <p className="upload-hint">PDF files only (Max 10MB)</p>
              </div>

              <input
                type="file"
                id="syllabusFileUpload"
                accept=".pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
                disabled={isUploading}
              />

              {uploadStatus && (
                <div
                  className="upload-status"
                  style={{
                    color: uploadStatus.includes("✓")
                      ? "var(--success)"
                      : "var(--primary)",
                    fontWeight: 500,
                  }}
                >
                  {uploadStatus}
                </div>
              )}

              {uploadError && (
                <div
                  className="upload-status"
                  style={{
                    color: "var(--error, #dc2626)",
                    fontWeight: 500,
                  }}
                >
                  ❌ {uploadError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={handleClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSkipToAnalysis}
                className="btn btn-secondary"
                disabled={isUploading}
              >
                Skip Upload
              </button>
              <button
                onClick={handleProceedToAnalysis}
                className="btn btn-primary"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? "Analyzing..." : "Proceed"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Category Configuration */}
        {step === 2 && (
          <div className="setup-step" id="step2">
            <div className="modal-header">
              <h2>Course Setup - Configure Categories</h2>
              <button onClick={handleClose} className="modal-close-btn">
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="setup-instruction">
                Define your grade categories, their weights, and number of
                items.
              </p>

              <div className="setup-categories-container">
                <div className="setup-categories-list">
                  {setupCategories.map((category) => (
                    <SetupCategoryCard key={category.id} category={category} />
                  ))}
                </div>

                <button
                  onClick={addSetupCategory}
                  className="btn btn-secondary btn-block"
                >
                  + Add Category
                </button>
              </div>

              <div className="setup-total-weight">
                <span>Total Weight: </span>
                <strong
                  className={isWeightValid ? "weight-valid" : "weight-invalid"}
                >
                  {totalWeight}%
                </strong>
                {!isWeightValid && (
                  <span className="setup-weight-warning">
                    {" "}
                    ⚠ Must equal 100%
                  </span>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={handleBackToUpload}
                className="btn btn-secondary"
              >
                Back
              </button>
              <button
                onClick={handleConfirmSetup}
                className="btn btn-primary"
                disabled={!isWeightValid}
              >
                Confirm Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
