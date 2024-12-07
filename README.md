![ElectriGo Logo](public/images/electrigo-logo.png)

## Design consideration of microservices
1. Loosely Coupled
   - Microservices should be loosely coupled, meaning changes in one service should not require changes in another. This allows for independent development and deployment.
2. Single Responsibility Principle
   - Each microservice should focus on a single business capability or function. This makes the service easier to manage and scale independently.
3. ...
   - ...

## Architecture Diagram
![Architecture Diagram for CNAD Assg1](public/images/readme/CNADAssg1-ArchitectureDiagram.png)

## Instructions 
### Setting up and running microservices
1. Add .env file with: GMAIL_EMAIL & GMAIL_APP_PASSWORD to the root folder of accountService and paymentService.
2. Download [Moesif Origin/CORS Changer & API Logger](https://chromewebstore.google.com/detail/moesif-origincors-changer/digfbfaphojjndkpccljibejjbppifbc) in Chrome Web Store and enable CORS to allow CRUD operations to work on the frontend.
3. In your terminal, change to command prompt and enter `start.bat` to run all of the microservices and frontend localhost.

Note: All demo account password is `Password123`