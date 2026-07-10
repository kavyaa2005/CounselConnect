# Models (Placeholder)

This directory contains placeholder model schemas.
Currently the app uses flat JSON files in `../data/` as mock storage.

When you're ready to integrate a real database (MongoDB, PostgreSQL, etc.):
1. Install the relevant ORM/driver (mongoose, prisma, sequelize, etc.)
2. Implement each model schema below using the shape defined in the services
3. Update each service to use the model instead of fileStore.utils
4. No controller or route changes needed — clean architecture ensures this

## User
Fields: id, firstName, lastName, email, passwordHash, phone, bio, avatar,
        reason, sessionType, frequency, goals[], notifications{}, privacy{},
        createdAt, updatedAt

## MoodEntry
Fields: id, userId, value(1-5), label, emoji, notes, date(YYYY-MM-DD), createdAt

## JournalEntry
Fields: id, userId, title, content, moodEmoji, moodLabel, moodColor, tags[],
        date, createdAt, updatedAt

## Appointment
Fields: id, userId, counselorId, counselorName, counselorAvatar, sessionType,
        date, time, dateTime, price, status, createdAt

## Message
Fields: id, userId, counselorId, text, isMe, read, time, createdAt

## Notification
Fields: id, userId, title, body, read, createdAt
