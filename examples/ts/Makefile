.PHONY: help run open clean

help:
	@echo "Model Health SDK Demo"
	@echo ""
	@echo "Available commands:"
	@echo "  make run    - Start HTTP server and open in browser"
	@echo "  make open   - Open demo in browser (server must be running)"
	@echo "  make clean  - Stop any running servers"
	@echo ""

run:
	@echo "Starting HTTP server on http://localhost:8888"
	@echo "Press Ctrl+C to stop the server"
	@echo ""
	@python3 -m http.server 8888 || python -m http.server 8888

open:
	@echo "Opening demo in browser..."
	@command -v xdg-open > /dev/null && xdg-open http://localhost:8888 || \
	 command -v open > /dev/null && open http://localhost:8888 || \
	 echo "Please open http://localhost:8888 in your browser"

clean:
	@echo "Stopping any servers on port 8888..."
	@lsof -ti:8888 | xargs kill -9 2>/dev/null || true
	@echo "Done"
