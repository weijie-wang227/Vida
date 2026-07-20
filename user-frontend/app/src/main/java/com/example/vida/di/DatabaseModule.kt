package com.example.vida.di

import android.content.Context
import androidx.room.Room
import com.example.vida.data.local.VidaDatabase
import com.example.vida.data.local.dao.ActivityDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

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
    ).build()

    @Provides
    fun provideActivityDao(database: VidaDatabase): ActivityDao = database.activityDao()
}
