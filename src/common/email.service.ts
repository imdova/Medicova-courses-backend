import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

type IEmailOptions = ISendMailOptions;

@Injectable()
export class EmailService {
    constructor(private readonly mailerService: MailerService) { }

    sendEmail(emailOptions: IEmailOptions) {
        return this.mailerService.sendMail({ ...emailOptions });
    }
}
