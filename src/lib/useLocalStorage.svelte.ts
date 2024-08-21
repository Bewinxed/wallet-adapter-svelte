import { onMount } from "svelte";
export function useLocalStorage<T>(key: string, defaultValue: T) {
    let value = $state(defaultValue);

    onMount(() => {
        try {
            const storedValue = localStorage.getItem(key);
            if (storedValue !== null) {
                value = JSON.parse(storedValue);
            }
        } catch (error) {
            console.error("Error reading from localStorage:", error);
        }
    });

    $effect(() => {
        try {
            if (value === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (error) {
            console.error("Error writing to localStorage:", error);
        }
    });

    return {
        get value() {
            return value;
        },
        set value(newValue) {
            value = newValue;
        }
    }
}
