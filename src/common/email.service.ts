import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

type IEmailOptions = ISendMailOptions;

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(private readonly mailerService: MailerService) { }

    async sendEmail(emailOptions: IEmailOptions) {
        try {
            const result = await this.mailerService.sendMail({ ...emailOptions });
            // If using jsonTransport, log the email content
            if (result && typeof result === 'object' && 'message' in result) {
                this.logger.log('Email would be sent (using dummy transport):', {
                    to: emailOptions.to,
                    subject: emailOptions.subject,
                });
            }
            return result;
        } catch (error) {
            this.logger.error('Failed to send email:', error.message);
            // Don't throw - allow the application to continue even if email fails
            return Promise.resolve();
        }
    }
}
