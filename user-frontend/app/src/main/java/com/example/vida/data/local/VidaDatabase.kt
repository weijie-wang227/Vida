package com.example.vida.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.example.vida.data.local.dao.ActivityDao
import com.example.vida.data.local.entity.ActivityEntity

@Database(
    entities = [ActivityEntity::class],
    version = 2,
    exportSchema = false,
)
@TypeConverters(VidaTypeConverters::class)
abstract class VidaDatabase : RoomDatabase() {
    abstract fun activityDao(): ActivityDao
}
