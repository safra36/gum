

export interface User {
	username: string;
	access: string[];
}


export interface LoginRequestDto {

    username : string,
    password : string

}


export interface LoginResponseDto {

    access_token : string

}