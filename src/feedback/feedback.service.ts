import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { FeedbackStatus, UserFeedbackEntity } from "./feedback.entity";
import {
  SubmitBugReportDto,
  SubmitHelpRequestDto,
  SubmitSupportFeedbackDto,
} from "./feedback.dto";

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(UserFeedbackEntity)
    private readonly feedbackRepo: Repository<UserFeedbackEntity>,
  ) {}

  async submitBugReport(userUid: string, dto: SubmitBugReportDto) {
    const attachmentsJson = this.serializeScreenshots(dto.screenshots);

    const row = this.feedbackRepo.create({
      userUid,
      kind: "bug_report",
      category: dto.category,
      title: dto.category,
      body: dto.message.trim(),
      deviceName: dto.deviceName.trim(),
      iosVersion: dto.iosVersion.trim(),
      appVersion: dto.appVersion.trim(),
      attachmentsJson,
      createdAt: new Date(),
    });

    await this.feedbackRepo.save(row);
    return { ok: true };
  }

  async submitHelpRequest(userUid: string, dto: SubmitHelpRequestDto) {
    const row = this.feedbackRepo.create({
      userUid,
      kind: "help_request",
      category: null,
      title: dto.subject.trim(),
      body: dto.message.trim(),
      deviceName: null,
      iosVersion: null,
      appVersion: null,
      attachmentsJson: null,
      status: "open",
      closedAt: null,
      createdAt: new Date(),
    });

    await this.feedbackRepo.save(row);
    return { ok: true };
  }

  async listHelpRequests(userUid: string, status: FeedbackStatus) {
    const rows = await this.feedbackRepo.find({
      where: {
        userUid,
        status,
        kind: In(["help_request", "support"]),
      },
      order: { createdAt: "DESC" },
    });

    return {
      items: rows.map((row) => ({
        feedbackUid: row.feedbackUid,
        subject: row.title ?? "Support request",
        message: row.body,
        status: row.status ?? status,
        createdAt: row.createdAt,
        closedAt: row.closedAt,
      })),
    };
  }

  /** @deprecated Use submitHelpRequest */
  async submitSupport(userUid: string, dto: SubmitSupportFeedbackDto) {
    return this.submitHelpRequest(userUid, {
      subject: dto.subject,
      message: dto.message,
    });
  }

  private serializeScreenshots(
    screenshots: SubmitBugReportDto["screenshots"],
  ): string | null {
    if (!screenshots?.length) {
      return null;
    }

    const payload = screenshots.map((shot) => {
      const bytes = Buffer.from(shot.dataBase64, "base64");
      if (bytes.length > 4_000_000) {
        throw new BadRequestException(
          `Screenshot ${shot.fileName} exceeds the 4 MB limit.`,
        );
      }

      return {
        fileName: shot.fileName,
        mimeType: shot.mimeType,
        dataBase64: shot.dataBase64,
      };
    });

    return JSON.stringify(payload);
  }
}
