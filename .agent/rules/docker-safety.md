# Docker Safety Rules

- **No Mass Killing**: NEVER run commands that kill all running containers (e.g., `docker kill $(docker ps -q)`) unless explicitly requested by the user.
- **No Service Stops/Starts**: NEVER stop or start the Docker service or main application services en masse without explicit instruction.
- **No Pruning**: NEVER run `docker system prune`, `docker volume prune`, or `docker network prune` (especially with `-a` or `--force`) unless specifically requested.
- **Targeted Actions Only**: Always prefer targeting specific containers or services by name/ID rather than using wildcards or bulk commands.
