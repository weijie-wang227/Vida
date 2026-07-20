package com.example.vida.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.vida.data.local.dao.ActivityDao
import com.example.vida.data.local.entity.ActivityEntity

@Database(
    entities = [ActivityEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class VidaDatabase : RoomDatabase() {
    abstract fun activityDao(): ActivityDao
}
