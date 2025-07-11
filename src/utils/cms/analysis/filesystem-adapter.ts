/**
 * FileSystemAdapter interface for abstracting filesystem operations
 * Enables testing with in-memory implementation and production with real filesystem
 */
export interface FileSystemAdapter {
  /**
   * Create a directory (with recursive option)
   */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  
  /**
   * Write data to a file
   */
  writeFile(path: string, data: string, encoding?: BufferEncoding): Promise<void>;
  
  /**
   * Read data from a file
   */
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  
  /**
   * Check if a file or directory exists
   */
  exists(path: string): Promise<boolean>;
  
  /**
   * Read directory contents
   */
  readdir(path: string): Promise<string[]>;
  
  /**
   * Delete a file
   */
  unlink(path: string): Promise<void>;
}

/**
 * Node.js filesystem adapter for production use
 */
export class NodeFileSystemAdapter implements FileSystemAdapter {
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(path, options);
  }

  async writeFile(path: string, data: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(path, data, encoding);
  }

  async readFile(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    const fs = await import('fs/promises');
    return await fs.readFile(path, encoding);
  }

  async exists(path: string): Promise<boolean> {
    const fs = await import('fs/promises');
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async readdir(path: string): Promise<string[]> {
    const fs = await import('fs/promises');
    return await fs.readdir(path);
  }

  async unlink(path: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.unlink(path);
  }
}

/**
 * In-memory filesystem adapter for testing
 * Supports configurable error injection for testing error scenarios
 */
export class InMemoryFileSystemAdapter implements FileSystemAdapter {
  private files = new Map<string, string>();
  private directories = new Set<string>();
  private errorConfig: {
    mkdirError?: Error;
    writeFileError?: Error;
    readFileError?: Error;
    existsError?: Error;
    readdirError?: Error;
    unlinkError?: Error;
  } = {};

  /**
   * Configure error injection for testing error scenarios
   */
  setErrorConfig(config: {
    mkdirError?: Error;
    writeFileError?: Error;
    readFileError?: Error;
    existsError?: Error;
    readdirError?: Error;
    unlinkError?: Error;
  }): void {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  /**
   * Clear error configuration
   */
  clearErrorConfig(): void {
    this.errorConfig = {};
  }

  /**
   * Get current file count (useful for testing)
   */
  getFileCount(): number {
    return this.files.size;
  }

  /**
   * Get file content (useful for testing)
   */
  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  /**
   * Check if directory exists (useful for testing)
   */
  hasDirectory(path: string): boolean {
    return this.directories.has(path);
  }

  /**
   * Clear all files and directories (useful for testing)
   */
  clear(): void {
    this.files.clear();
    this.directories.clear();
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    if (this.errorConfig.mkdirError) {
      throw this.errorConfig.mkdirError;
    }
    
    this.directories.add(path);
    
    // Handle recursive directory creation if needed
    if (options?.recursive) {
      const pathParts = path.split('/');
      let currentPath = '';
      for (const part of pathParts) {
        if (part) {
          currentPath += (currentPath ? '/' : '') + part;
          this.directories.add(currentPath);
        }
      }
    }
  }

  async writeFile(path: string, data: string, encoding?: BufferEncoding): Promise<void> {
    if (this.errorConfig.writeFileError) {
      throw this.errorConfig.writeFileError;
    }
    
    this.files.set(path, data);
  }

  async readFile(path: string, encoding?: BufferEncoding): Promise<string> {
    if (this.errorConfig.readFileError) {
      throw this.errorConfig.readFileError;
    }
    
    if (!this.files.has(path)) {
      const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
      (error as any).code = 'ENOENT';
      (error as any).errno = -2;
      (error as any).path = path;
      throw error;
    }
    
    return this.files.get(path)!;
  }

  async exists(path: string): Promise<boolean> {
    if (this.errorConfig.existsError) {
      throw this.errorConfig.existsError;
    }
    
    return this.files.has(path) || this.directories.has(path);
  }

  async readdir(path: string): Promise<string[]> {
    if (this.errorConfig.readdirError) {
      throw this.errorConfig.readdirError;
    }
    
    if (!this.directories.has(path)) {
      const error = new Error(`ENOENT: no such file or directory, scandir '${path}'`);
      (error as any).code = 'ENOENT';
      (error as any).errno = -2;
      (error as any).path = path;
      throw error;
    }
    
    // Return files in this directory
    const files: string[] = [];
    for (const filePath of this.files.keys()) {
      const fileName = filePath.split('/').pop();
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      if (dirPath === path && fileName) {
        files.push(fileName);
      }
    }
    
    return files;
  }

  async unlink(path: string): Promise<void> {
    if (this.errorConfig.unlinkError) {
      throw this.errorConfig.unlinkError;
    }
    
    if (!this.files.has(path)) {
      const error = new Error(`ENOENT: no such file or directory, unlink '${path}'`);
      (error as any).code = 'ENOENT';
      (error as any).errno = -2;
      (error as any).path = path;
      throw error;
    }
    
    this.files.delete(path);
  }
}

/**
 * Factory for creating FileSystemAdapter instances
 */
export class FileSystemAdapterFactory {
  /**
   * Create a FileSystemAdapter instance
   * @param type - Type of adapter to create ('node' for production, 'memory' for testing)
   * @returns FileSystemAdapter instance
   */
  static create(type: 'node' | 'memory'): FileSystemAdapter {
    switch (type) {
      case 'node':
        return new NodeFileSystemAdapter();
      case 'memory':
        return new InMemoryFileSystemAdapter();
      default:
        throw new Error(`Unknown FileSystemAdapter type: ${type}`);
    }
  }
}