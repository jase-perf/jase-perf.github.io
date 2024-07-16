// skillTree.js
export let skillTree = {
    nodes: {}
};

export function loadSkillTree(data) {
    skillTree = data;
}

export function saveSkillTree() {
    return JSON.parse(JSON.stringify(skillTree));
}

// undoRedo.js
let undoStack = [];
let redoStack = [];

export function pushState(state) {
    undoStack.push(state);
    redoStack = [];
}

export function undo() {
    if (undoStack.length > 0) {
        redoStack.push(skillTree.saveSkillTree());
        return undoStack.pop();
    }
    return null;
}

export function redo() {
    if (redoStack.length > 0) {
        undoStack.push(skillTree.saveSkillTree());
        return redoStack.pop();
    }
    return null;
}

// mermaidDiagram.js
import { skillTree } from './skillTree.js';

export function generateMermaidDiagram() {
    // ... (existing generateMermaidDiagram logic)
}

export function updateDiagram() {
    // ... (existing updateDiagram logic)
}



// ... (main application logic, event listeners, etc.)