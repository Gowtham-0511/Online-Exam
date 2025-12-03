import { useState, useRef } from "react";

export function useExamViolations() {
    // Violation counts
    const [violations, setViolations] = useState(0);
    const [keyViolations, setKeyViolations] = useState(0);
    const [tabSwitchViolations, setTabSwitchViolations] = useState(0);
    const [screenChangeViolations, setScreenChangeViolations] = useState(0);

    // Violation timestamps
    const [lastTabSwitchTime, setLastTabSwitchTime] = useState<string>("");
    const [lastScreenChangeTime, setLastScreenChangeTime] = useState<string>("");

    // Tab visibility
    const [isTabVisible, setIsTabVisible] = useState(true);

    // Refs for violation tracking
    const violationsRef = useRef(0);
    const keyViolationsRef = useRef(0);
    const tabSwitchViolationsRef = useRef(0);
    const screenChangeViolationsRef = useRef(0);
    const lastVisibilityChangeRef = useRef(Date.now());
    const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Event handler refs
    const handleContextMenuRef = useRef<((e: any) => void) | null>(null);
    const handleKeyDownRef = useRef<((e: any) => void) | null>(null);
    const handleBlurRef = useRef<((e: any) => void) | null>(null);
    const handleFsChangeRef = useRef<((e: any) => void) | null>(null);
    const handleVisibilityChangeRef = useRef<((e: any) => void) | null>(null);

    // Submission tracking
    const hasSubmittedRef = useRef(false);

    return {
        // Violation counts
        violations,
        setViolations,
        keyViolations,
        setKeyViolations,
        tabSwitchViolations,
        setTabSwitchViolations,
        screenChangeViolations,
        setScreenChangeViolations,

        // Violation timestamps
        lastTabSwitchTime,
        setLastTabSwitchTime,
        lastScreenChangeTime,
        setLastScreenChangeTime,

        // Tab visibility
        isTabVisible,
        setIsTabVisible,

        // Violation refs
        violationsRef,
        keyViolationsRef,
        tabSwitchViolationsRef,
        screenChangeViolationsRef,
        lastVisibilityChangeRef,
        visibilityTimeoutRef,

        // Event handler refs
        handleContextMenuRef,
        handleKeyDownRef,
        handleBlurRef,
        handleFsChangeRef,
        handleVisibilityChangeRef,

        // Submission tracking
        hasSubmittedRef,
    };
}