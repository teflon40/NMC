export interface ParsedTask {
    title: string;
    procedures: ParsedProcedure[];
}

export interface ParsedProcedure {
    step: number;
    description: string;
    maxMarks: number;
}

// Helper to convert Roman numerals to integers
const romanToInt = (s: string): number => {
    const map: Record<string, number> = {
        i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000,
        I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000
    };
    let result = 0;
    for (let i = 0; i < s.length; i++) {
        const current = map[s[i]];
        const next = map[s[i + 1]];
        if (next && current < next) {
            result -= current;
        } else {
            result += current;
        }
    }
    return result || 0;
};

export const parseTasksFromText = (text: string): ParsedTask[] => {
    const tasks: ParsedTask[] = [];

    // Split text into lines for processing
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    let currentTask: ParsedTask | null = null;
    let currentStep = 0;
    let currentDescLines: string[] = [];
    let inProcedureSection = false;

    // Regex patterns
    // Matches "1.", "2.", "i.", "ii.", "iii.", "iv.", "v.", etc.
    const stepStartRegex = /^\s*([ivxlcdm]+|\d+)\.?\s+/i;
    const scorePattern = /(?:0|o)\s*(?:1|t|L|!)\s*2\s*3\s*4/gi;
    const partialScorePattern = /0\s*1\s*2\s*3\s*4/g;
    const stringEndsWithScore = /[\s0oO][\s1Ilt][\s2][\s3][\s4]$/i;

    // Helper to finalize current step
    const finalizeStep = () => {
        if (currentTask && currentStep > 0 && currentDescLines.length > 0) {
            let desc = currentDescLines.join(' ');

            // Cleanup junk
            desc = desc.replace(scorePattern, '');
            desc = desc.replace(partialScorePattern, '');
            desc = desc.replace(/RATING/gi, '');
            desc = desc.replace(/\s\d\s\d\s\d\s\d\s\d\s*$/, '');
            desc = desc.replace(/\s+/g, ' ').trim();

            // Skip noise lines
            if (desc.includes('The basic technique was not done well') ||
                desc.includes('The technique was performed correctly') ||
                desc.toLowerCase().startsWith('step omitted')) {
                return;
            }

            if (desc.length > 3) {
                currentTask.procedures.push({
                    step: currentStep,
                    description: desc,
                    maxMarks: 4 // Default
                });
            }
        }
    };

    // Helper to finalize current task
    const finalizeTask = () => {
        finalizeStep();
        if (currentTask && currentTask.procedures.length > 0) {
            tasks.push(currentTask);
        }
        currentTask = null;
        currentStep = 0;
        currentDescLines = [];
        inProcedureSection = false;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip common headers/footers
        if (line.match(/CANDIDATE'S NUMBER/i)) continue;
        if (line.match(/CENTRE/i)) continue;
        if (line.match(/SCORE OBTAINED/i)) continue;
        if (line.match(/NAME OF EXAMINER/i)) continue;
        if (line.match(/^RATING$/i)) continue;
        if (line.match(/^RATING KEY/i)) continue;

        // Check for "Component Tasks:" which indicates procedure section start
        if (line.match(/Component Tasks:/i) || line.match(/COMPONENT TASK/i)) {
            inProcedureSection = true;
            continue;
        }

        // Check for explicit "TASK:" or "TASK 1:" prefix first (highest priority)
        if (line.match(/^TASK\s*\d*:/i)) {
            const taskTitle = line.replace(/^TASK\s*\d*:\s*/i, '').trim();
            if (taskTitle.length > 0) {
                console.log('📋 Detected task title (TASK prefix):', taskTitle);
                finalizeTask();
                currentTask = {
                    title: taskTitle,
                    procedures: []
                };
                inProcedureSection = false;
                continue;
            }
        }

        // Detect new task: ALL CAPS line that's not a step number and not a header
        const isAllCaps = line === line.toUpperCase() && line.length > 5 && /[A-Z]/.test(line);
        const hasMultipleWords = line.split(/\s+/).length >= 2;
        const notAStepNumber = !line.match(stepStartRegex);

        if (isAllCaps && hasMultipleWords && notAStepNumber) {
            const looksLikeNewTask = !currentTask ||
                currentTask.procedures.length === 0 ||
                (currentTask.procedures.length > 0 && line.length < 80);

            if (looksLikeNewTask) {
                console.log('📋 Detected task title (ALL CAPS):', line);
                finalizeTask();
                currentTask = {
                    title: line,
                    procedures: []
                };
                inProcedureSection = false;
                continue;
            }
        }

        // If we don't have a current task yet, skip
        if (!currentTask) continue;

        // Check for numbered/roman numeral step
        const match = line.match(stepStartRegex);
        const hasScoreAtEnd = line.match(stringEndsWithScore) || line.match(/0\s*1\s*2\s*3\s*4$/);

        if (match || (inProcedureSection && hasScoreAtEnd)) {
            // New step found
            finalizeStep();

            let stepNumStr = match ? match[1] : (currentStep + 1).toString();
            let stepVal = parseInt(stepNumStr);

            // If it's NaN, try Roman numeral conversion
            if (isNaN(stepVal)) {
                stepVal = romanToInt(stepNumStr);
            }

            currentStep = stepVal;

            // Get description
            let restOfLine = line;
            if (match) {
                restOfLine = line.substring(match[0].length).trim();
            }
            currentDescLines = [restOfLine];
            inProcedureSection = true;
        } else {
            // Continuation of previous step
            if (currentStep > 0) {
                // Check if it's strictly a score line
                if (line.replace(/\s/g, '').match(/^[0o][1tL]234$/i)) {
                    continue;
                }
                currentDescLines.push(line);
            }
        }
    }

    // Finalize last task
    finalizeTask();

    console.log(`✅ Parsed ${tasks.length} tasks total:`, tasks.map(t => `${t.title} (${t.procedures.length} steps)`));

    return tasks;
};
