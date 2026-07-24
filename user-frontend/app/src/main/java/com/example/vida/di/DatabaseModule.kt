package com.example.vida.di

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.vida.data.local.VidaDatabase
import com.example.vida.data.local.dao.ActivityDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

private object Migration1To2 : Migration(1, 2) {
    override fun migrate(database: SupportSQLiteDatabase) {
        database.execSQL(
            "ALTER TABLE activities ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'",
        )
    }
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(
        @ApplicationContext context: Context,
    ): VidaDatabase = Room.databaseBuilder(
        context,
        VidaDatabase::class.java,
        "vida.db",
    )
        .addMigrations(Migration1To2)
        .build()

    @Provides
    fun provideActivityDao(database: VidaDatabase): ActivityDao = database.activityDao()
}
