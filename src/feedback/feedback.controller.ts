import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { FeedbackService } from "./feedback.service";
import {
  ListHelpRequestsQueryDto,
  SubmitBugReportDto,
  SubmitHelpRequestDto,
  SubmitSupportFeedbackDto,
} from "./feedback.dto";

@UseGuards(JwtAuthGuard)
@Controller("feedback")
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post("bug-report")
  async submitBugReport(@Req() req: any, @Body() dto: SubmitBugReportDto) {
    return this.feedbackService.submitBugReport(req.user.userUid, dto);
  }

  @Post("help-request")
  async submitHelpRequest(@Req() req: any, @Body() dto: SubmitHelpRequestDto) {
    return this.feedbackService.submitHelpRequest(req.user.userUid, dto);
  }

  @Get("help-requests")
  async listHelpRequests(@Req() req: any, @Query() query: ListHelpRequestsQueryDto) {
    return this.feedbackService.listHelpRequests(req.user.userUid, query.status);
  }

  /** @deprecated Use POST /feedback/help-request */
  @Post("support")
  async submitSupport(@Req() req: any, @Body() dto: SubmitSupportFeedbackDto) {
    return this.feedbackService.submitSupport(req.user.userUid, dto);
  }
}
