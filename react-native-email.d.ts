
export type SendEmailOptions = {
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    body?: string;
    checkCanOpen?: boolean;
};

declare async function sendEmail(to: string[] | string, options?: SendEmailOptions): Promise<any>;

export default sendEmail;
