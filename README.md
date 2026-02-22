# systemA1
distribution task scheduler system.


## how to run
1. npm install
2. npx prisma generate client


## how to start 
1. npm run server
2. npm run worker
3. npm run add-task
4. npm run test-status


# Single Server Task Scheduler

-   First read the assesment and in order to understand the assesment i create the single server task scheduler so i can understand how the single server will work and what is the limitation of single server where it hit hight and why we need distributed Server Task Scheduler 


From Single Server Task Scheduler i understand basic things

repo - https://github.com/prayag-ahire/systemB1

-   i have use google , chatGpt to understand how the single server task scheduler will work and what is the limitation of single server where it hit hight and why we need distributed Server Task Scheduler 


1. Added automic dequeue - so the worker don’t take same task if one worker have take task no 5 then other worker will can’t take it

    -   For this i have added row-level lock
    -   Other transections can not lock that task.
    -   So other workers skip that already locked task.
    -   Other worker goes to the next task.
    -   This prevent race-condition and double execution


2.  controlled worker pool - their is limited worker will spawn in each loop and also added indexing so each time will not scan entier table, check each row for every poll


3.  Crash & Shutdown Safety - stop polling, Finish running task, exit cleanly , If missing → stuck RUNNING jobs.

4.  failer task -  added logic that will gradually add 2X time for nextAttempt also if task is running more then 5 min then stop it change the state form running to queue

5.  Observability - can see logs used pino for logging ,added Health endpoint.

6.  Operational Safety - rate limiting api, protect db, memory, queue growth, use zod for input validation, Max Payload Size, task cleanup every 7 days, limit payload size

7.  Performance Readiness - added the polling interval constant DB pressure CPU waste


## after create this single server task scheduler after that i change little bit to make it distributed task scheduler system

-   i have set the limit to concurrency of worker so it will not take more then 100 task at a time and prevent the DB pressure and CPU waste and server crash

