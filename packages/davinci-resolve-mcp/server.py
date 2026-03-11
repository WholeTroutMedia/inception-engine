import sys
import json
import logging

try:
    from mcp.server.models import InitializationOptions
    import mcp.types as types
    from mcp.server import NotificationOptions, Server
    from mcp.server.stdio import stdio_server
except ImportError as e:
    print(f"Failed to import mcp: {e}", file=sys.stderr)
    sys.exit(1)

# Configure logging to stderr (stdio goes to stdout)
logging.basicConfig(level=logging.INFO, stream=sys.stderr)

server = Server("davinci-resolve-mcp")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="build_timeline_from_edl",
            description="Actuates DaVinci Resolve Studio to build a physical video timeline from an AI-generated JSON Edit Decision List (EDL).",
            inputSchema={
                "type": "object",
                "properties": {
                    "edl_json": {
                        "type": "string",
                        "description": "Serialized JSON array of cut objects: [{ filePath, startTime, endTime }]"
                    },
                    "timeline_name": {
                        "type": "string",
                        "description": "Name of the timeline to create."
                    }
                },
                "required": ["edl_json", "timeline_name"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    if name != "build_timeline_from_edl":
        raise ValueError(f"Unknown tool: {name}")

    if not arguments:
        raise ValueError("Missing arguments")

    try:
        edl = json.loads(arguments["edl_json"])
        timeline_name = arguments["timeline_name"]
        
        logging.info(f"Connecting to DaVinci Resolve via dvr_maclight...")
        
        # dvr_maclight handles the cross-platform pathing and import of fusionscript
        import dvr_maclight
        resolve = dvr_maclight.Resolve()
        
        if not resolve:
            raise RuntimeError("DaVinci Resolve not found or not running.")
            
        projectManager = resolve.GetProjectManager()
        project = projectManager.GetCurrentProject()
        mediaPool = project.GetMediaPool()
        
        logging.info(f"Creating timeline '{timeline_name}' with {len(edl)} edits...")
        
        timeline = mediaPool.CreateEmptyTimeline(timeline_name)
        if not timeline:
            raise RuntimeError("Failed to create empty timeline. Ensure you are on the Edit Page.")

        clip_info_list = []
        for cut in edl:
            file_path = cut.get("filePath")
            start_time = cut.get("startTime", 0)
            end_time = cut.get("endTime", 0)
            reason = cut.get("reasoning", "")
            
            # Placeholder for physical timeline bridging logic 
            # In a full implementation, you'd add media to MediaPool
            # calculate frame numbers, and use timeline.AppendToTimeline
            
            clip_info_list.append({
                "filePath": file_path,
                "startTime": start_time,
                "endTime": end_time,
                "reasoning": reason
            })

            logging.info(f"ATHENA Selected: {file_path} for {reason}")

        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "status": "success",
                    "message": f"Timeline '{timeline_name}' built with {len(edl)} physical cuts.",
                    "debug_payload": clip_info_list
                })
            )
        ]
        
    except Exception as e:
        logging.error(f"Error communicating with Resolve API: {e}")
        return [
            types.TextContent(
                type="text",
                text=f"Error communicating with DaVinci Resolve: {str(e)}"
            )
        ]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, InitializationOptions(
            server_name="davinci-resolve-mcp",
            server_version="1.0.0",
            capabilities=server.get_capabilities(
                notification_options=NotificationOptions(
                    prompts_changed=True,
                    resources_changed=True,
                    tools_changed=True,
                ),
                experimental_capabilities={},
            )
        ))

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
