
// Define interfaces to match MCP SDK types
interface TextContent {
  type: 'text';
  text: string;
  [key: string]: unknown;  // Index signature to allow additional properties
}

interface CallToolResult {
  content: TextContent[];
  [key: string]: unknown;  // Index signature to allow additional properties
}

/**
 * Utility class for formatting MCP responses
 */
export class ResponseFormatter {
  /**
   * Format a successful response with text content
   * @param text Text content to include in response
   * @returns Formatted MCP tool call result
   */
  static success(text: string): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  /**
   * Format a successful response with multiple text contents
   * @param texts Array of text contents to include in response
   * @returns Formatted MCP tool call result
   */
  static successMultiple(texts: string[]): CallToolResult {
    return {
      content: texts.map(text => ({ 
        type: 'text',
        text,
      } as TextContent)),
    };
  }

  /**
   * Format an error response
   * @param error Error message or object
   * @returns Formatted MCP tool call result with error message
   */
  static error(error: any): CallToolResult {
    const errorMessage = typeof error === 'string' 
      ? error
      : error instanceof Error 
        ? error.message 
        : JSON.stringify(error);

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
    };
  }
}
