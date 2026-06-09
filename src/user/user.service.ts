import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppUserEntity } from "./user.entity";
import { AppUserDeletedEntity } from "./user-deleted.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(AppUserEntity)
    private readonly repo: Repository<AppUserEntity>,

    @InjectRepository(AppUserDeletedEntity)
    private readonly deletedRepo: Repository<AppUserDeletedEntity>,
  ) {}

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async findById(userUid: string) {
    return this.repo.findOne({ where: { userUid } });
  }

  async findByUsername(username: string) {
    return this.repo.findOne({ where: { username } });
  }

  async isUsernameAvailable(username: string, excludeUserUid?: string) {
    const existing = await this.findByUsername(username);
    if (!existing) return true;
    if (excludeUserUid && existing.userUid === excludeUserUid) return true;
    return false;
  }

  async createUser(data: Partial<AppUserEntity>) {
    const u = this.repo.create(data);
    return this.repo.save(u);
  }

  async markEmailVerified(userUid: string) {
    await this.repo.update({ userUid }, { emailVerifiedAt: new Date(), status: "active" });
    return this.findById(userUid);
  }

  async completeProfile(userUid: string, data: { birthDate: string; username: string }) {
    const user = await this.findById(userUid);
    if (!user) throw new NotFoundException("User not found");

    user.birthDate = data.birthDate;
    user.username = data.username;
    user.usernameChangedAt = new Date();

    await this.repo.save(user);
    return user;
  }

  /** @deprecated Use AccountDeletionService.purgeAccount after email confirmation. */
  async deleteAccount(userUid: string) {
    throw new BadRequestException(
      "Direct account deletion is disabled. Confirm deletion with the emailed code.",
    );
  }
}