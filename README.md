# Teacher Activity System - API Reference

สรุป REST API ของโปรเจคสำหรับนักพัฒนา (back-end/front-end)

Base URL: `http://<HOST>:<PORT>/api`

ทั่วไป:
- ทุก endpoint ที่ระบุ `Authenticate: Yes` ต้องส่ง header `Authorization: Bearer <token>`
- วันที่/เวลาในตัวอย่างควรปรับตามระบบของคุณ

----

## Authentication

- POST `/auth/register`
  - Auth: No
  - Body (JSON):
    ```json
    { "fullname": "ชื่อ-นามสกุล", "email": "user@example.com", "password": "password", "userType": "student|admin|teacher" }
    ```

- POST `/auth/login`
  - Auth: No
  - Body (JSON):
    ```json
    { "email": "user@example.com", "password": "password" }
    ```

- GET `/auth/me`
  - Auth: Yes
  - Returns current user

- POST `/auth/change-password`
  - Auth: Yes
  - Body:
    ```json
    { "oldPassword": "old", "newPassword": "new" }
    ```

- POST `/auth/reset-password/:userId`
  - Auth: Yes
  - URL param: `userId`

- POST `/auth/logout`
  - Auth: Yes

----

## Users

- GET `/users`
  - Auth: No
  - Returns all users

- GET `/users/:id`
  - Auth: No
  - URL param: `id`

- POST `/users`
  - Auth: No
  - Body example (create student or employee):
    ```json
    {
      "studentId": "6105100001", // optional for employees
      "fullname": "สมชาย ใจดี",
      "email": "s6105100001@email.kmutnb.ac.th",
      "password": "plaintext-password",
      "phone": "0812345678",
      "majorId": "<major-uuid>",
      "userType": "student|teacher|admin",
      "birthday": "15/01/2000",
      "status": "active"
    }
    ```

- PUT `/users/:id`
  - Auth: No
  - Body: send only fields to update (partial allowed)

- DELETE `/users/:id`
  - Auth: No
  - Soft delete (sets status or role as deleted)

- DELETE `/users/:id/permanent`
  - Auth: No
  - Permanently remove user

- GET `/users/employees/all`
  - Auth: No
  - Returns users with userType admin/teacher

- GET `/users/students/all`
  - Auth: No
  - Returns users with userType student

----

## Departments

- GET `/departments`
  - Auth: No
  - Returns departments with counts

- GET `/departments/:id`
  - Auth: No
  - URL param: `id`

- POST `/departments`
  - Auth: No
  - Body:
    ```json
    { "name": "คณะ/แผนกชื่อ" }
    ```

- PUT `/departments/:id`
  - Auth: No
  - Body: partial e.g.
    ```json
    { "name": "ชื่อใหม่" }
    ```

- DELETE `/departments/:id`
  - Auth: No
  - Prevents delete if users or activities exist

- GET `/departments/:id/stats`
  - Auth: No
  - Returns counts: totalUsers, totalEmployees, totalStudents, activeActivities

----

## Majors

- GET `/majors`
  - Auth: No

- GET `/majors/:id`
  - Auth: No

- POST `/majors`
  - Auth: No
  - Body:
    ```json
    { "name": "วิทยาการคอมพิวเตอร์", "departmentId": "<department-uuid>" }
    ```

- PUT `/majors/:id`
  - Auth: No
  - Body: partial

- DELETE `/majors/:id`
  - Auth: No
  - Prevents delete if related records exist

----

## TypeActivities

- GET `/type-activities`
  - Auth: No

- GET `/type-activities/:id`
  - Auth: No

- POST `/type-activities`
  - Auth: No
  - Body:
    ```json
    { "name": "กิจกรรมสัมพันธ์" }
    ```

- PUT `/type-activities/:id`
  - Auth: No
  - Body: partial

- DELETE `/type-activities/:id`
  - Auth: No

----

## Activities

- GET `/activities`
  - Auth: No
  - Query params (optional): `status`, `departmentId`, `responsibleId`

- GET `/activities/:id`
  - Auth: No
  - Returns activity with relations (department, responsible, attendances, fileActivities, majorJoins)

- POST `/activities`
  - Auth: No
  - Body (JSON):
    ```json
    {
      "name": "กิจกรรมทัศนศึกษา",
      "description": "รายละเอียด...",
      "date": "2025-12-10T09:00:00.000Z",
      "address": "ห้องประชุม",
      "departmentId": "<department-uuid>",
      "responsibleId": "<user-uuid>",
      "peopleCount": 0,
      "maxPeopleCount": 100,
      "hour": 3,
      "majorIds": ["<major-uuid>", "<major-uuid>"]  // optional: majors that can join
    }
    ```

- PUT `/activities/:id`
  - Auth: No
  - Body: any of the above fields (partial). If `majorIds` sent will replace the major join list.

- DELETE `/activities/:id`
  - Auth: No

- GET `/activities/responsible/:userId`
  - Auth: No
  - Get activities where `responsibleId` == userId

----

## Attendances

- GET `/attendances`
  - Auth: No

- GET `/attendances/:id`
  - Auth: No

- POST `/attendances`
  - Auth: No
  - Body:
    ```json
    {
      "userId": "<user-uuid>",
      "activityId": "<activity-uuid>",
      "reason": "เหตุผล (ถ้ามี)",
      "status": "joined|accepted|rejected|Inprogress|completed|uncompleted"
    }
    ```

- PUT `/attendances/:id`
  - Auth: No
  - Body: partial (update reason/status)

- DELETE `/attendances/:id`
  - Auth: No

- GET `/attendances/user/:userId`
  - Auth: No

- GET `/attendances/activity/:activityId`
  - Auth: No

----

## Files (activity files and CSV import)

- GET `/files`
  - Auth: Yes
  - Query: `activityId` optional

- GET `/files/:id`
  - Auth: Yes

- POST `/files/upload` (multipart/form-data)
  - Auth: Yes
  - Form field: `file` (file), Body field: `activityId` (string)

- POST `/files/upload-multiple` (multipart/form-data)
  - Auth: Yes
  - Form field: `files` (array), Body field: `activityId`

- POST `/files/upload-students-csv` (multipart/form-data)
  - Auth: Yes
  - Form field: `file` (CSV). CSV header must include: `id,fullname,birthday[,major,email,phone]`
  - Response: `{ message, created, errors }` — errors include row numbers and messages

- DELETE `/files/:id`
  - Auth: Yes

- GET `/files/:id/download`
  - Auth: Yes

- GET `/files/activity/:activityId`
  - Auth: Yes

----

## Logs

- GET `/logs` (Auth: Yes) - get all logs
- GET `/logs/stats` (Auth: Yes)
- GET `/logs/:id` (Auth: Yes)
- POST `/logs` (Auth: Yes) - create log record
- DELETE `/logs/:id` (Auth: Yes)
- POST `/logs/delete-old` (Auth: Yes) - delete old logs

----

Notes & Tips
- All JSON request bodies should set `Content-Type: application/json`.
- File uploads must use `multipart/form-data` and the field names above.
- Major lookups: when creating/updating activities you can provide `majorIds` (UUIDs). For CSV import, `major` must be supplied as the major *name*.
- Passwords for CSV-imported students are produced by hashing the raw `birthday` string stored in the CSV (use `bcrypt` on the server).

If you want, I can:
- Add a Postman collection (exported JSON) with all endpoints and example requests.
- Add a `docs/students.csv` template file to the repo.
- Mark which endpoints require admin roles and add example responses.

----

Generated: 7 ธันวาคม 2568
