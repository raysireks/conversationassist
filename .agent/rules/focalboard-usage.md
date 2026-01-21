# Focalboard Tool Usage Rules

- **Pagination is Required**: The `mcp_focalboardmcp_get_cards` tool uses pagination. 
- **No Truncation**: Results are not truncated; they are paginated.
- **Handling Large Lists**: When listing cards, do not assume a single call returns everything. You MUST check if you need to fetch subsequent pages (`page` parameter) to get all items.
- **Sequential Processing**: As per user global memory, process focalboard operations sequentially.
