resource "aws_instance" "app_server" {

  ami = data.aws_ami.amazon_linux.id   #changeme
  instance_type = "t2.micro"
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  associate_public_ip_address = true
  key_name = "vockey"
  user_data = templatefile("./install.sh", {})

  tags = {
    Name = "Jenkins-SonarQube"
  }
}
resource "aws_security_group" "Jenkins-VM-SG" {

  name = "Jenkins-VM-SG"
  description = "Allow TLS inbound traffic"

  
  ingress = [
    for port in [20, 80, 8080, 9000, 3000] : {
      description = "inbound rules"
      from_port = port
      to_port   = port
      protocol = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      ipv6_cidr_blocks = []
      prefix_list_ids = []
      security_groups = []
      self = false
    }
  ]

  # OUTBOUND
  egress {
    from_port = 0
    to_port   = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "Jenkins-VM-SG"
  }
}

