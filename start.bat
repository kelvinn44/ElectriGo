@echo off

REM Start Account Service
echo Starting Account Service...
cd accountService
start cmd /k "go run main.go"
cd ..

REM Start Car Rental Service
echo Starting Car Rental Service...
cd carRentalService
start cmd /k "go run main.go"
cd ..

REM Start Front-end Live Server
echo Starting Front-end Live Server...
cd public
start cmd /k "npx live-server"
cd ..

REM End of script
exit
