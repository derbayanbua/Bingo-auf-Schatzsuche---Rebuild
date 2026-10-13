// Auto-registers every scene port in this folder (each file calls registerOrigScene(...) at import).
// Porting agents only add files here – no central list to edit.
import.meta.glob(['./*.ts', '!./index.ts'], { eager: true });
