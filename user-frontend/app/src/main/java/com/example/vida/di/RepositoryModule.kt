package com.example.vida.di

import com.example.vida.data.repository.OfflineFirstActivitiesRepository
import com.example.vida.domain.repository.ActivitiesRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindActivitiesRepository(
        repository: OfflineFirstActivitiesRepository,
    ): ActivitiesRepository
}
