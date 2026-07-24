package com.example.vida.di

import com.example.vida.data.repository.DefaultAuthRepository
import com.example.vida.data.repository.DefaultFeedRepository
import com.example.vida.data.repository.DefaultGroupsRepository
import com.example.vida.data.repository.DefaultProfileRepository
import com.example.vida.data.repository.OfflineFirstActivitiesRepository
import com.example.vida.domain.repository.AuthRepository
import com.example.vida.domain.repository.ActivitiesRepository
import com.example.vida.domain.repository.FeedRepository
import com.example.vida.domain.repository.GroupsRepository
import com.example.vida.domain.repository.ProfileRepository
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
    abstract fun bindAuthRepository(
        repository: DefaultAuthRepository,
    ): AuthRepository

    @Binds
    @Singleton
    abstract fun bindActivitiesRepository(
        repository: OfflineFirstActivitiesRepository,
    ): ActivitiesRepository

    @Binds
    @Singleton
    abstract fun bindFeedRepository(repository: DefaultFeedRepository): FeedRepository

    @Binds
    @Singleton
    abstract fun bindGroupsRepository(repository: DefaultGroupsRepository): GroupsRepository

    @Binds
    @Singleton
    abstract fun bindProfileRepository(repository: DefaultProfileRepository): ProfileRepository
}
