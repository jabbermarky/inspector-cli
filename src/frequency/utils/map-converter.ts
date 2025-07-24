/**
 * Map Conversion Utilities
 * Safe conversion functions for Map types used throughout frequency analysis
 * Prevents data loss and type mismatches at Map/Object boundaries
 */

/**
 * Safely convert Map<string, Set<string>> to Record<string, string>
 * Used for headers and similar multi-value data structures
 */
export function mapOfSetsToRecord(map: Map<string, Set<string>> | null | undefined): Record<string, string> {
  if (!map || !(map instanceof Map)) {
    return {};
  }
  
  return Object.fromEntries(
    Array.from(map.entries()).map(([key, valueSet]) => {
      // Safely handle if valueSet is not a Set
      const values = valueSet instanceof Set ? 
        Array.from(valueSet) : 
        Array.isArray(valueSet) ? valueSet : [String(valueSet)];
      return [key, values.join(', ')];
    })
  );
}

/**
 * Safely convert Map<string, Set<string>> to meta tag array format
 * Used specifically for DetectionDataPoint.metaTags conversion
 */
export function mapOfSetsToMetaTags(map: Map<string, Set<string>> | null | undefined): Array<{name: string, content: string}> {
  if (!map || !(map instanceof Map)) {
    return [];
  }
  
  return Array.from(map.entries()).map(([name, valueSet]) => {
    // Safely handle if valueSet is not a Set
    const values = valueSet instanceof Set ? 
      Array.from(valueSet) : 
      Array.isArray(valueSet) ? valueSet : [String(valueSet)];
    return { name, content: values.join(', ') };
  });
}

/**
 * Validate that a value is actually a Map
 * Useful for runtime type checking
 */
export function isMap(value: any): value is Map<any, any> {
  return value instanceof Map;
}

/**
 * Validate that a value is actually a Set
 * Useful for runtime type checking
 */
export function isSet(value: any): value is Set<any> {
  return value instanceof Set;
}

/**
 * Debug utility to inspect Map structure
 * Helps identify conversion issues during development
 */
export function inspectMapStructure(map: any, label: string = 'Map'): void {
  console.log(`[Map Inspector] ${label}:`);
  console.log(`  Type: ${typeof map}`);
  console.log(`  Is Map: ${isMap(map)}`);
  console.log(`  Constructor: ${map?.constructor?.name}`);
  
  if (isMap(map)) {
    console.log(`  Size: ${map.size}`);
    const firstEntry = map.entries().next().value;
    if (firstEntry) {
      const [key, value] = firstEntry;
      console.log(`  First entry: ${key} -> ${typeof value} (${value?.constructor?.name})`);
      if (isSet(value)) {
        console.log(`    Set size: ${value.size}`);
        console.log(`    Set values: [${Array.from(value).slice(0, 3).join(', ')}...]`);
      }
    }
  } else {
    console.log(`  Object keys: [${Object.keys(map || {}).slice(0, 5).join(', ')}...]`);
  }
}

/**
 * JSON replacer function for Map serialization
 * Use with JSON.stringify(obj, mapJsonReplacer)
 */
export function mapJsonReplacer(key: string, value: any): any {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  if (value instanceof Set) {
    return Array.from(value);
  }
  return value;
}